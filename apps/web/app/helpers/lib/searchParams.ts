import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsJson,
} from "nuqs/server";
import { z } from "zod";

export const homeSearchParamsCache = createSearchParamsCache({
  firstTime: parseAsBoolean.withDefault(false),
});

export const chatSearchParamsCache = createSearchParamsCache({
  firstTime: parseAsBoolean.withDefault(false),
  q: parseAsString.withDefault(""),
  spaces: parseAsArrayOf(
    parseAsJson(() =>
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    ),
  ).withDefault([]),
});
