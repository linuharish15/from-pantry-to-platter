import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id";
import { servingsCountSchema } from "./recipe-validation";

export const consultationRequestSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  language: z.string().trim().min(2).max(40).default("English"),
  recipeTitle: z.string().trim().max(160).optional(),
  servings: servingsCountSchema.optional(),
  imageDataUrl: z.string().max(4_000_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/).optional(),
}).strict();

export type ConsultationRequest = z.infer<typeof consultationRequestSchema>;

const consultationSchema = z.object({
  answer: z.string().trim().min(1),
  cautions: z.array(z.string().trim().min(1)).max(5),
  followUp: z.string().trim().min(1).optional(),
}).strict();

export type ConsultationResponse = z.infer<typeof consultationSchema>;

export async function askChef(request: Request, data: ConsultationRequest): Promise<
  | { ok: true; data: ConsultationResponse }
  | { ok: false; error: string }
> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "The Kitchen Consultation service is not configured yet." };

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  const recipeContext = data.recipeTitle
    ? `The user is preparing ${data.recipeTitle}${data.servings ? ` for ${data.servings} people` : ""}.`
    : "No specific recipe is currently selected.";

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: [
        "You are a courteous, expert chef providing Kitchen Consultation.",
        `Answer in ${data.language}.`,
        "Answer worldwide cooking questions, ingredient substitutions, preparation, doneness, allergies, food safety, equipment, plating, and cooking doubts.",
        "Follow the 7 Cs: Clear, Concise, Concrete, Correct, Complete, Coherent, and Courteous.",
        "Do not invent precise allergy guarantees. State uncertainty and encourage professional advice for severe allergies.",
        "Give measurable quantities, temperatures, time ranges, and an observable doneness cue whenever relevant.",
        "Keep the answer practical and avoid unnecessary preamble.",
      ].join(" "),
      messages: [{
        role: "user",
        content: data.imageDataUrl
          ? [
              { type: "text", text: `${recipeContext}\nQuestion: ${data.question}\nUse the attached photo when answering. Describe visible food only and state uncertainty when identification is unclear.` },
              { type: "image", image: data.imageDataUrl },
            ]
          : `${recipeContext}\nQuestion: ${data.question}`,
      }],
      abortSignal: request.signal,
      output: Output.object({ schema: consultationSchema, name: "kitchen_consultation" }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false },
      },
    });

    const output = await result.output;
    if (!output) return { ok: false, error: "I could not complete the consultation. Please try again." };
    return { ok: true, data: consultationSchema.parse(output) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, error: "Please add a little more detail to the cooking question." };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Consultation was stopped." };
    }
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      return { ok: false, error: "The chef is busy right now. Please wait a moment and try again." };
    }
    return { ok: false, error: "The Kitchen Consultation is temporarily unavailable. Please try again." };
  }
}
