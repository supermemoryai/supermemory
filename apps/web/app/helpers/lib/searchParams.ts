import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsBoolean,
} from "nuqs/server";

export const homeSearchParamsCache = createSearchParamsCache({
  firstTime: parseAsBoolean.withDefault(false),
});
