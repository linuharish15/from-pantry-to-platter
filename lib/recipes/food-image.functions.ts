import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { foodImageRequestSchema, identifyFoodImage as identifyFoodImageOnServer } from "./food-image.server";

export const identifyFoodPhoto = createServerFn({ method: "POST" })
  .validator((input: unknown) => foodImageRequestSchema.parse(input))
  .handler(async ({ data }) => identifyFoodImageOnServer(getRequest(), data));
