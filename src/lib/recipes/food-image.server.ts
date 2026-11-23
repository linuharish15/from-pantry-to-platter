import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id";

export const foodImageRequestSchema = z.object({
  imageDataUrl: z.string()
    .max(4_000_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
  language: z.string().trim().min(2).max(40).default("English"),
}).strict();

const foodImageResponseSchema = z.object({
  ingredients: z.array(z.string().trim().min(1)).max(24),
  dishName: z.string().trim().nullable(),
  observation: z.string().trim().min(1),
}).strict();

export type FoodImageResponse = z.infer<typeof foodImageResponseSchema>;

export async function identifyFoodImage(request: Request, data: z.infer<typeof foodImageRequestSchema>): Promise<
  | { ok: true; data: FoodImageResponse }
  | { ok: false; error: string }
> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "Photo identification is not configured yet. Please try again later." };

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request)).fetch,
  });

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: [
        "You are Pantry & Plate's food photo helper. Reply in the requested language.",
        "Identify only food ingredients and prepared dishes that are visibly recognizable in the photo.",
        "Return common ingredient names that a home cook could search for. Do not guess hidden ingredients, allergens, or food safety.",
        "If a prepared dish is recognizable, give its likely name. If it is uncertain, return null and say so in the observation.",
        "Keep the observation brief and courteous. The user will review and correct every suggestion.",
      ].join(" "),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Identify visible food ingredients and any recognizable prepared dish. Respond in ${data.language}.` },
          { type: "image", image: data.imageDataUrl },
        ],
      }],
      abortSignal: request.signal,
      output: Output.object({ schema: foodImageResponseSchema, name: "food_photo_identification" }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false },
      },
    });

    const output = await result.output;
    if (!output) return { ok: false, error: "I could not identify food in that photo. Try a clearer image or type the ingredients." };
    return { ok: true, data: foodImageResponseSchema.parse(output) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, error: "I could not read that food photo. Try a clearer image or type the ingredients." };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Photo identification was stopped." };
    }
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      return { ok: false, error: "The photo helper is busy right now. Please wait a moment and try again." };
    }
    console.error("Food photo identification failed:", error instanceof Error ? error.message : "Unknown error");
    return { ok: false, error: "Photo identification is temporarily unavailable. You can still type your ingredients." };
  }
}
