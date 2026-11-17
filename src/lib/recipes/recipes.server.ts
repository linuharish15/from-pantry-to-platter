import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id";

const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
  haveIt: z.boolean(),
}).strict();

const stepSchema = z.object({
  title: z.string(),
  instruction: z.string(),
}).strict();

const recipeSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  timeMinutes: z.number(),
  difficulty: z.string(),
  servings: z.number(),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema),
  tip: z.string(),
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
};

export type RecipeResponse = z.infer<typeof recipeResponseSchema>;

function safeGatewayMessage(error: unknown) {
  if (!APICallError.isInstance(error)) {
    return "We couldn’t prepare recipes right now. Please try again.";
  }

  const status = error.statusCode;
  let upstreamMessage = "";
  if (error.responseBody) {
    try {
      const parsed: unknown = JSON.parse(error.responseBody);
      if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
        upstreamMessage = parsed.message;
      }
    } catch {
      upstreamMessage = "";
    }
  }

  if (status === 401) return "The cooking assistant is not configured yet. Please try again later.";
  if (status === 402 || status === 403) return upstreamMessage || "Recipe generation is temporarily unavailable. Please try again later.";
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
  if (!apiKey) return { ok: false, error: "The cooking assistant is not configured yet. Please try again later." };

  const initialRunId = getLovableAiGatewayRunId(request);
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
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
    "You are Pantry & Plate, a thoughtful, practical home-cooking assistant.",
    "Create appealing, realistic recipes using the user's pantry ingredients and the requested serving count.",
    "For ingredient mode, suggest exactly three distinct dishes, prioritizing items they already have and clearly marking every ingredient they need to buy.",
    "For dish mode, provide one authentic, complete recipe for the named dish with a useful full ingredient list and numbered cooking steps.",
    "Use common kitchen measurements, safe cooking guidance, achievable times, and short, clear instructions.",
    "Never claim the user has an ingredient unless it is in their provided list. Omit pantry staples from missing items only when the user explicitly listed them.",
    "Set each ingredient's haveIt to true only when they said they have it. Return all recipe ingredients, not just missing items.",
  ].join(" ");

  const prompt = data.mode === "dish"
    ? `Make a complete recipe for ${data.dish}. I have: ${items}. Scale it for ${data.servings} servings.`
    : `I have these ingredients: ${items}. Suggest three dishes I can cook, favoring recipes that use what I already have. Scale each for ${data.servings} servings.`;

  try {
    const result = streamText({
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

    // The Responses request streams upstream; the server consumes the complete structured result.
    const output = await result.output;
    if (!output) return { ok: false, error: "I couldn’t prepare a complete recipe. Please try again." };
    return { ok: true, data: recipeResponseSchema.parse(output) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, error: "I couldn’t prepare a complete recipe. Try adding a few more details." };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Recipe generation was stopped." };
    }
    console.error("Recipe generation failed:", error instanceof Error ? error.message : "Unknown error");
    return { ok: false, error: safeGatewayMessage(error) };
  }
}