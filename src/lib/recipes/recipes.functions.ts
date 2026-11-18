import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { generateRecipes } from "./recipes.server";
import { recipeRequestSchema } from "./recipe-validation";

export const getRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => recipeRequestSchema.parse(input))
  .handler(async ({ data }) => {
    return generateRecipes(getRequest(), data);
  });