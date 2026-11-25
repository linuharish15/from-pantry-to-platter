import { describe, expect, it } from "vitest";

import { APICallError } from "ai";
import { consultationRequestSchema } from "./consultation.server";
import { consultationActionSchema } from "./consultation.shared";
import { recipeRequestSchema } from "./recipe-validation";
import { safeGatewayMessage } from "./recipes.server";

describe("food assistant request coverage", () => {
  it("accepts a specifically named worldwide dish for a large group", () => {
    const result = recipeRequestSchema.safeParse({
      mode: "dish",
      ingredients: [],
      dish: "Kunafa",
      servings: 100_000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cuisine).toBe("All Worldwide Cuisines");
      expect(result.data.language).toBe("English");
    }
  });

  it("accepts the worldwide, regional, dessert, and snack cuisine preferences", () => {
    for (const cuisine of ["All Worldwide Cuisines", "Ethiopian", "Desserts", "Snacks"]) {
      expect(recipeRequestSchema.safeParse({
        mode: "ingredients",
        ingredients: ["flour", "sugar"],
        dish: "",
        servings: 4,
        cuisine,
      }).success).toBe(true);
    }
  });

  it("rejects counts beyond safe whole-number precision", () => {
    expect(recipeRequestSchema.safeParse({
      mode: "dish",
      ingredients: [],
      dish: "Kunafa",
      servings: Number.MAX_SAFE_INTEGER + 1,
    }).success).toBe(false);
  });

  it("passes large serving counts into Kitchen Consultation", () => {
    expect(consultationRequestSchema.safeParse({
      question: "How long should I bake it?",
      servings: 100_000,
    }).success).toBe(true);
  });

  it("accepts bounded page context and recent conversation turns", () => {
    expect(consultationRequestSchema.safeParse({
      question: "Can I make this for four?",
      history: [{ role: "user", text: "I have rice and tomatoes." }],
      appContext: {
        mode: "ingredients",
        servings: 2,
        cuisine: "Indian",
        language: "English",
        ingredients: ["rice", "tomato"],
        dish: "",
        recipes: ["Tomato rice"],
      },
    }).success).toBe(true);
  });

  it("accepts only supported in-app actions", () => {
    expect(consultationActionSchema.safeParse({ type: "set_servings", servings: 4 }).success).toBe(true);
    expect(consultationActionSchema.safeParse({ type: "set_servings", servings: 0 }).success).toBe(false);
    expect(consultationActionSchema.safeParse({ type: "send_email", address: "example@example.com" }).success).toBe(false);
  });

  it("keeps an AI credit message visible when the streaming error wraps it", () => {
    const gatewayError = new APICallError({
      message: "Payment Required",
      url: "https://ai.gateway.lovable.dev/v1/responses",
      requestBodyValues: {},
      statusCode: 402,
      responseBody: JSON.stringify({ message: "Add AI credits to continue." }),
    });

    expect(safeGatewayMessage(new Error("No output generated", { cause: gatewayError }))).toBe("Add AI credits to continue.");
  });

  it("explains how to configure the AI gateway after an unauthorized response", () => {
    const gatewayError = new APICallError({
      message: "Unauthorized",
      url: "https://ai.gateway.lovable.dev/v1/responses",
      requestBodyValues: {},
      statusCode: 401,
    });

    expect(safeGatewayMessage(gatewayError)).toContain("LOVABLE_API_KEY");
    expect(safeGatewayMessage(gatewayError)).toContain("Lovable Secrets");
  });
});
