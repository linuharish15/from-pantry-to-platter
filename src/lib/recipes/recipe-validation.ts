import { z } from "zod";

export const recipeRequestSchema = z.object({
  mode: z.enum(["ingredients", "dish"]),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  dish: z.string().trim().max(100),
  servings: z.number().int().min(1).max(12),
}).strict();

export type RecipeRequestInput = z.infer<typeof recipeRequestSchema>;

export function getRecipeRequestError(input: RecipeRequestInput) {
  if (input.mode === "dish" && !input.dish.trim()) return "Enter a dish name first.";
  if (input.mode === "ingredients" && input.ingredients.length === 0) return "Add at least one ingredient first.";
  return undefined;
}