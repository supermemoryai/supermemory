import { z } from "zod";

export const userObj = z.object({
  message: z.string(),
  data: z.object({
    session: z.object({
      sessionToken: z.string(),
      userId: z.string(),
      expires: z.string(),
    }),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable().optional(),
      emailVerified: z.string().nullable(),
      image: z.string().nullable().optional(),
    }),
  }),
});
