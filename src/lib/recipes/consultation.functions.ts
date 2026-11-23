import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { askChef, consultationRequestSchema } from "./consultation.server";

export const askKitchenChef = createServerFn({ method: "POST" })
  .validator((input: unknown) => consultationRequestSchema.parse(input))
  .handler(async ({ data }) => askChef(getRequest(), data));
