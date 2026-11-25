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
  duration: z.string().trim().min(1),
  checkpoint: z.string().trim().min(1),
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
  currency: string;
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
    "You are IngreDine, a thoughtful, practical worldwide home-cooking assistant.",
    `Answer in ${data.language}.`,
    `Apply this cuisine preference: ${data.cuisine}. If All Worldwide Cuisines is selected, any dish from any cuisine in the world is welcome.`,
    "You can help with any food: main meals, desserts, sweets, snacks, breads, sauces, chutneys, pickles, drinks, side dishes and dietary variants.",
    "Create appealing, realistic, culturally respectful recipes for the exact requested number of people.",
    "For ingredient mode, suggest exactly three distinct dishes. Favor ingredients the user already has, but never misclassify pantry ownership.",
    "For dish mode, provide one authentic, complete recipe for the named dish.",
    "SCALING: Every ingredient quantity must be concrete and correctly scaled for the exact serving count. Use grams, millilitres, cups or counts, and re-scale pan sizes, pot sizes and cooking times sensibly for large groups.",
    "requiredIngredients is the complete recipe list; ingredients repeats that list with quantities and haveIt flags. Keep both lists consistent.",
    "Separate availableIngredients and missingIngredients by name. Set haveIt true only when that ingredient is in the user's supplied pantry list. Treat water and common salt as available.",
    `Give estimatedCost as a realistic range in ${data.currency} for the whole batch and say it is approximate. If you cannot estimate reliably, say so plainly.`,
    "Provide prepMinutes, cookMinutes, timeMinutes (prep plus cook), difficulty (Easy, Medium or Hard), equipment, substitutions and practical safety guidance.",
    "WRITE EVERY STEP USING THE 7 Cs OF COMMUNICATION:",
    "Clear: one action per step, plain everyday words, no jargon without a short explanation.",
    "Concise: instruction is at most 40 words; no filler.",
    "Concrete: give exact quantities, heat level or temperature in both °C and °F, utensil sizes and times.",
    "Correct: accurate technique, safe internal temperatures and allergen-aware advice; never guess uncertain facts.",
    "Complete: the steps cover everything from washing and prep through cooking, resting and serving, with nothing assumed.",
    "Coherent: steps follow a logical order, and each one builds on the step before it.",
    "Courteous: a warm, polite, encouraging tone (for example 'Please', 'Gently', 'Well done'), never commanding or rude.",
    "For each step also fill duration (for example '5 minutes', or 'Instant' when it is a quick action) and checkpoint (what the cook should see, smell or feel to know the step is done).",
    "Step titles are 2 to 5 words. Keep tip to one helpful sentence.",
  ].join(" ");

  const prompt = data.mode === "dish"
    ? `Make a complete recipe for ${data.dish}. Cuisine preference: ${data.cuisine}. Ingredients I already have (may be empty): ${items}. Scale every quantity for exactly ${data.servings} people. Respond in ${data.language}.`
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
