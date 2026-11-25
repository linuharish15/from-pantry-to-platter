import { z } from "zod";

import { currencyCodes, cuisineOptions, WORLDWIDE_CUISINE } from "./options";

export const MAX_SERVINGS = 100;

export const recipeRequestSchema = z.object({
  mode: z.enum(["ingredients", "dish"]),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  dish: z.string().trim().max(100),
  servings: z.number().int().min(1).max(MAX_SERVINGS),
  cuisine: z.string().trim().max(60)
    .refine((value) => cuisineOptions.includes(value), "Choose a cuisine from the list.")
    .optional()
    .default(WORLDWIDE_CUISINE),
  language: z.string().trim().min(2).max(40).optional().default("English"),
  currency: z.enum(currencyCodes).optional().default("INR"),
}).strict();

export type RecipeRequestInput = z.infer<typeof recipeRequestSchema>;

export function getRecipeRequestError(input: Pick<RecipeRequestInput, "mode" | "ingredients" | "dish" | "servings">) {
  if (input.mode === "dish" && !input.dish.trim()) return "Enter a dish name first.";
  if (input.mode === "ingredients" && input.ingredients.length === 0) return "Add at least one ingredient first.";
  if (!Number.isInteger(input.servings) || input.servings < 1 || input.servings > MAX_SERVINGS) {
    return `Enter a number of people from 1 to ${MAX_SERVINGS}.`;
  }
  return undefined;
}
