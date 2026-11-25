import { describe, expect, it } from "vitest";

import { recipeRequestSchema } from "./recipe-validation";

describe("food assistant request coverage", () => {
  it("accepts a specifically named worldwide dish for up to 100 people", () => {
    const result = recipeRequestSchema.safeParse({
      mode: "dish",
      ingredients: [],
      dish: "Kunafa",
      servings: 100,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cuisine).toBe("All Worldwide Cuisines");
      expect(result.data.language).toBe("English");
    }
  });

  it("accepts the worldwide, regional, dessert, and snack cuisine preferences", () => {
    for (const cuisine of ["All Worldwide Cuisines", "South Indian", "Ethiopian", "Desserts", "Snacks", "Vegan"]) {
      expect(recipeRequestSchema.safeParse({
        mode: "ingredients",
        ingredients: ["flour", "sugar"],
        dish: "",
        servings: 4,
        cuisine,
      }).success).toBe(true);
    }
  });

  it("rejects serving counts above the supported limit", () => {
    expect(recipeRequestSchema.safeParse({
      mode: "dish",
      ingredients: [],
      dish: "Kunafa",
      servings: 101,
    }).success).toBe(false);
  });

  it("rejects a cuisine that is not in the picker list", () => {
    expect(recipeRequestSchema.safeParse({ mode: "dish", ingredients: [], dish: "Kunafa", servings: 2, cuisine: "Not a cuisine" }).success).toBe(false);
  });

  it("lists All Worldwide Cuisines as the final cuisine option", async () => {
    const { cuisineOptions } = await import("./options");
    expect(cuisineOptions.at(-1)).toBe("All Worldwide Cuisines");
  });
});
