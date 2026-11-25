import { describe, expect, it } from "vitest";

import { consultationActionSchema } from "../../../lib/recipes/consultation.shared";
import { consultationRequestSchema } from "../../../lib/recipes/consultation.server";

describe("consultation assistant context and actions", () => {
  it("accepts bounded page context and recent conversation turns", () => {
    const result = consultationRequestSchema.safeParse({
      question: "Can I make this for four?",
      history: [{ role: "user", text: "I have rice and tomatoes." }],
      appContext: {
        section: "consult",
        servings: 2,
        cuisine: "Indian",
        language: "English",
        ingredients: ["rice", "tomato"],
        dishPantry: [],
        dishName: "",
        visibleRecipes: ["Tomato rice"],
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts only supported actions with valid values", () => {
    expect(consultationActionSchema.safeParse({ type: "set_servings", servings: 4 }).success).toBe(true);
    expect(consultationActionSchema.safeParse({ type: "set_servings", servings: 0 }).success).toBe(false);
    expect(consultationActionSchema.safeParse({ type: "send_email", address: "example@example.com" }).success).toBe(false);
  });
});
