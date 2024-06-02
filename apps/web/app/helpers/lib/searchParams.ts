import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsBoolean,
  parseAsArrayOf,
} from "nuqs/server";

export const homeSearchParamsCache = createSearchParamsCache({
  firstTime: parseAsBoolean.withDefault(false),
});

export const chatSearchParamsCache = createSearchParamsCache({
  firstTime: parseAsBoolean.withDefault(false),
  q: parseAsString.withDefault(""),
  spaces: parseAsArrayOf(parseAsInteger, ","),
});
