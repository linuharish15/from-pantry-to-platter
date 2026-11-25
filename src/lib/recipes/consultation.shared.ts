import { z } from "zod";

import { servingsCountSchema } from "./recipe-validation";

export const consultationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set_mode"), mode: z.enum(["ingredients", "dish"]) }).strict(),
  z.object({ type: z.literal("set_servings"), servings: servingsCountSchema }).strict(),
  z.object({ type: z.literal("set_dish"), dish: z.string().trim().min(1).max(100) }).strict(),
  z.object({
    type: z.literal("set_ingredients"),
    ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  }).strict(),
]);

export const consultationHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(2000),
}).strict();

export const consultationAppContextSchema = z.object({
  mode: z.enum(["ingredients", "dish"]),
  servings: servingsCountSchema,
  cuisine: z.string().trim().min(1).max(40),
  language: z.string().trim().min(2).max(40),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  dish: z.string().trim().max(100),
  recipes: z.array(z.string().trim().min(1).max(160)).max(3),
}).strict();
