import { z } from "zod";

export const recipeRequestSchema = z.object({
  mode: z.enum(["ingredients", "dish"]),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  dish: z.string().trim().max(100),
  servings: z.number().int().min(1).max(100),
  cuisine: z.enum([
    "All Worldwide Cuisines", "Indian", "Italian", "Chinese", "Japanese", "Thai",
    "Korean", "Mexican", "Mediterranean", "Middle Eastern", "French", "African",
    "Caribbean", "American", "British", "Spanish", "Southeast Asian", "Vietnamese",
    "Filipino", "Indonesian", "Turkish", "Greek", "Brazilian", "Ethiopian", "West African",
    "Nordic", "Persian", "Vegetarian", "Vegan", "Gluten-free", "Quick meals", "Desserts", "Snacks",
  ]).optional().default("All Worldwide Cuisines"),
  language: z.string().trim().min(2).max(40).optional().default("English"),
}).strict();

export type RecipeRequestInput = z.infer<typeof recipeRequestSchema>;

export function getRecipeRequestError(input: Pick<RecipeRequestInput, "mode" | "ingredients" | "dish" | "servings">) {
  if (input.mode === "dish" && !input.dish.trim()) return "Enter a dish name first.";
  if (input.mode === "ingredients" && input.ingredients.length === 0) return "Add at least one ingredient first.";
  if (!Number.isInteger(input.servings) || input.servings < 1 || input.servings > 100) {
    return "Enter a serving count from 1 to 100 people.";
  }
  return undefined;
}
