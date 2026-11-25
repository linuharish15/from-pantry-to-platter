import { describe, expect, it } from "vitest";

import { getRecipeRequestError, recipeRequestSchema } from "./recipe-validation";

describe("recipe request limits", () => {
  it("accepts up to 24 ingredients", () => {
    const ingredients = Array.from({ length: 24 }, (_, index) => `ingredient ${index + 1}`);
    expect(recipeRequestSchema.safeParse({ mode: "ingredients", ingredients, dish: "", servings: 2 }).success).toBe(true);
  });

  it("rejects more than 24 ingredients", () => {
    const ingredients = Array.from({ length: 25 }, (_, index) => `ingredient ${index + 1}`);
    expect(recipeRequestSchema.safeParse({ mode: "ingredients", ingredients, dish: "", servings: 2 }).success).toBe(false);
  });

  it("accepts any positive safe whole-number serving count", () => {
    for (const servings of [1, 12, 101, 1_000_000, Number.MAX_SAFE_INTEGER]) {
      expect(recipeRequestSchema.safeParse({ mode: "dish", ingredients: [], dish: "Biryani", servings }).success).toBe(true);
    }
  });

  it("rejects non-positive, fractional, or unsafe serving counts", () => {
    for (const servings of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(recipeRequestSchema.safeParse({ mode: "dish", ingredients: [], dish: "Biryani", servings }).success).toBe(false);
    }
  });

  it("does not show a maximum-count validation error for a large valid group", () => {
    expect(getRecipeRequestError({ mode: "dish", ingredients: [], dish: "Biryani", servings: 1_000_000 })).toBeUndefined();
  });

  it("requires a dish name when requesting a specific recipe", () => {
    expect(getRecipeRequestError({ mode: "dish", ingredients: [], dish: "", servings: 2 })).toBe("Enter a dish name first.");
  });

  it("requires at least one ingredient when asking for dish ideas", () => {
    expect(getRecipeRequestError({ mode: "ingredients", ingredients: [], dish: "", servings: 2 })).toBe("Add at least one ingredient first.");
  });
});