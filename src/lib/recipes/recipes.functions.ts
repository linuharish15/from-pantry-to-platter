import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateRecipes } from "./recipes.server";

const requestSchema = z.object({
  mode: z.enum(["ingredients", "dish"]),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(24),
  dish: z.string().trim().max(100),
  servings: z.number().int().min(1).max(12),
}).strict();

export const getRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const request = new Request("http://localhost", { signal: AbortSignal.timeout(120_000) });
    return generateRecipes(request, data);
  });