import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { servingsCountSchema } from "./recipe-validation";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id";

const ingredientSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.string().trim().min(1),
  haveIt: z.boolean(),
}).strict();

const stepSchema = z.object({
  title: z.string().trim().min(1),
  instruction: z.string().trim().min(1),
}).strict();

const recipeSchema = z.object({
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  description: z.string().trim().min(1),
  prepMinutes: z.number().int().min(0).max(1440),
  cookMinutes: z.number().int().min(0).max(1440),
  timeMinutes: z.number().int().min(1).max(1440),
  difficulty: z.string().trim().min(1),
  servings: servingsCountSchema,
  estimatedCost: z.string().trim().min(1),
  requiredIngredients: z.array(ingredientSchema).min(1),
  availableIngredients: z.array(z.string().trim().min(1)),
  missingIngredients: z.array(z.string().trim().min(1)),
  ingredients: z.array(ingredientSchema).min(1),
  equipment: z.array(z.string().trim().min(1)),
  substitutions: z.array(z.string().trim().min(1)),
  steps: z.array(stepSchema).min(1).max(20),
  tip: z.string().trim().min(1),
}).strict();

const recipeResponseSchema = z.object({
  introduction: z.string(),
  recipes: z.array(recipeSchema),
}).strict();

export type RecipeRequest = {
  mode: "ingredients" | "dish";
  ingredients: string[];
  dish: string;
  servings: number;
  cuisine: string;
  language: string;
};

export type RecipeResponse = z.infer<typeof recipeResponseSchema>;

function findGatewayError(error: unknown): APICallError | undefined {
  const visited = new Set<unknown>();
  let current = error;
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    if (APICallError.isInstance(current)) return current;
    if (!(current instanceof Error)) return undefined;
    current = current.cause;
  }
  return undefined;
}

export function safeGatewayMessage(error: unknown) {
  const apiError = findGatewayError(error);
  if (!apiError) {
    return "We couldn’t prepare recipes right now. Please try again.";
  }

  const status = apiError.statusCode;
  let upstreamMessage = "";
  if (apiError.responseBody) {
    try {
      const parsed: unknown = JSON.parse(apiError.responseBody);
      if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
        upstreamMessage = parsed.message;
      }
    } catch {
      upstreamMessage = "";
    }
  }

  if (status === 401) return "The AI assistant needs its LOVABLE_API_KEY secret configured. Add it in Lovable Secrets or the local server environment, then restart the app.";
  if (status === 402) return upstreamMessage || "Recipe generation is paused because this workspace has no available AI credits. Add credits to continue.";
  if (status === 403) return upstreamMessage || "Recipe generation is unavailable due to an access or workspace setting.";
  if (status === 429) return "The recipe service is busy. Please wait a moment, then try again.";
  if (status !== undefined && status >= 500) return "The recipe service is temporarily unavailable. Please try again shortly.";
  if (status === 400) return "I couldn’t read that recipe request. Please try a shorter ingredient list or dish name.";
  return "We couldn’t prepare recipes right now. Please try again.";
}

export async function generateRecipes(request: Request, data: RecipeRequest): Promise<
  | { ok: true; data: RecipeResponse }
  | { ok: false; error: string }
> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "The AI assistant needs its LOVABLE_API_KEY secret configured. Add it in Lovable Secrets or the local server environment, then restart the app." };

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  const items = data.ingredients.length ? data.ingredients.join(", ") : "No ingredients provided";
  const instructions = [
    "You are IngreDine, a practical, friendly worldwide cooking assistant.",
    `Reply in ${data.language}. Apply the cuisine preference ${data.cuisine}; All Worldwide Cuisines means any world cuisine.`,
    "Help with all cooking-related food: main dishes, desserts, snacks, breads, drinks, sauces, side dishes, and dietary alternatives.",
    "For ingredient requests, return exactly three distinct recipes. For a named dish, return one complete recipe for that exact dish.",
    `Scale every ingredient quantity for exactly ${data.servings} people. Keep quantities concrete and consistent across requiredIngredients and ingredients.`,
    "Set haveIt true only for items explicitly provided by the user. Fill availableIngredients and missingIngredients accurately.",
    "Return realistic prep and cooking minutes, total minutes, difficulty, equipment, substitutions, approximate estimated cost, and a concise tip.",
    "Write practical numbered cooking steps in a clear, concise, concrete, correct, complete, coherent and courteous style. Include action order, quantities, heat, time, and visible doneness cues when relevant.",
    "Use safe cooking temperatures and do not invent facts or make unsupported allergy guarantees.",
  ].join(" ");
  const prompt = data.mode === "dish"
    ? `Give me the full recipe and cooking steps for ${data.dish}. I have these optional ingredients: ${items}. Make it for exactly ${data.servings} people, in ${data.language}. Cuisine preference: ${data.cuisine}.`
    : `I have: ${items}. Give exactly three different dishes I can make, with complete recipes and cooking steps. Make each for exactly ${data.servings} people. Reply in ${data.language}. Cuisine preference: ${data.cuisine}.`;

  try {
    const result = streamText({
      // Use a supported Lovable gateway model; an unknown model ID causes every recipe request to fail.
      model: provider.responses("openai/gpt-6-astra"),
      instructions,
      prompt,
      abortSignal: request.signal,
      output: Output.object({ schema: recipeResponseSchema, name: "recipe_suggestions" }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    if (!output) return { ok: false, error: "The chef did not return a complete recipe. Please try again with a little more detail." };
    return { ok: true, data: recipeResponseSchema.parse(output) };
  } catch (error) {
    const gatewayError = findGatewayError(error);
    if (gatewayError) {
      console.error("Recipe generation failed:", gatewayError.message);
      return { ok: false, error: safeGatewayMessage(gatewayError) };
    }
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("Recipe response did not match the required recipe structure.", error.message);
      return { ok: false, error: "The chef could not format that recipe. Please try again with a shorter dish name or ingredient list." };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Recipe generation was stopped." };
    }
    console.error("Recipe generation failed:", error instanceof Error ? error.message : "Unknown error");
    return { ok: false, error: safeGatewayMessage(error) };
  }
}
