import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

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
  servings: z.number().int().min(1).max(100),
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
    "You are Pantry & Plate, a thoughtful, practical worldwide home-cooking assistant.",
    `Answer in ${data.language}.`,
    `Apply this cuisine preference: ${data.cuisine}. If All Worldwide Cuisines is selected, choose authentic dishes from any world cuisine.`,
    "You may answer meals, desserts, snacks, sauces, drinks with culinary relevance, side dishes, and dietary variants.",
    "Create appealing, realistic, culturally respectful recipes using the user's pantry ingredients and the exact requested serving count.",
    "For ingredient mode, suggest exactly three distinct dishes. Favor ingredients the user already has, but never misclassify pantry ownership.",
    "For dish mode, provide one authentic, complete recipe for the named dish.",
    "Every ingredient quantity must be concrete and mathematically appropriate for the exact serving count.",
    "requiredIngredients is the complete recipe list; ingredients repeats that list with quantities and haveIt flags. Keep both lists consistent.",
    "Separate availableIngredients and missingIngredients by name. Set ingredient haveIt true only when that exact ingredient is in the user's supplied pantry list.",
    "Estimate cost as a range and name the currency or region when possible; say when a reliable estimate is unavailable.",
    "Provide preparation minutes, cooking minutes, total time, difficulty, estimatedCost, equipment, substitutions, and practical safety guidance.",
    "Write steps using the 7 Cs: Clear, Concise, Concrete, Correct, Complete, Coherent, and Courteous.",
    "Use sequential numbered steps, visible measurements, temperatures, doneness cues, and realistic cooking times. Be accurate about allergens and food safety; do not guess uncertain information.",
  ].join(" ");

  const prompt = data.mode === "dish"
    ? `Make a complete recipe for ${data.dish}. Cuisine preference: ${data.cuisine}. I have: ${items}. Scale every quantity for exactly ${data.servings} people. Respond in ${data.language}.`
    : `I have these ingredients: ${items}. Cuisine preference: ${data.cuisine}. Suggest exactly three dishes I can cook, favoring recipes that use what I already have. Scale every quantity for exactly ${data.servings} people. Respond in ${data.language}.`;

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
