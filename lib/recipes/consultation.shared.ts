import { z } from "zod";

export const consultationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("navigate"), section: z.enum(["ingredients", "dish", "consult"]) }).strict(),
  z.object({ type: z.literal("set_servings"), servings: z.number().int().min(1).max(100) }).strict(),
  z.object({ type: z.literal("set_dish"), dish: z.string().trim().min(1).max(100) }).strict(),
  z.object({ type: z.literal("set_ingredients"), ingredients: z.array(z.string().trim().min(1).max(60)).max(24) }).strict(),
]);

export type ConsultationAction = z.infer<typeof consultationActionSchema>;

export const consultationHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(2000),
}).strict();

export const consultationAppContextSchema = z.object({
  section: z.enum(["ingredients", "dish", "consult"]),
  servings: z.number().int().min(1).max(100),
  cuisine: z.string().trim().min(1).max(40),
  language: z.string().trim().min(2).max(40),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  dishPantry: z.array(z.string().trim().min(1).max(60)).max(24),
  dishName: z.string().trim().max(100),
  selectedRecipe: z.string().trim().max(160).optional(),
  visibleRecipes: z.array(z.string().trim().min(1).max(160)).max(3),
}).strict();
