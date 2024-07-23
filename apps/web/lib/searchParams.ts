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
	spaces: parseAsJson((c) => {
		const valid = z
			.array(
				z.object({
					id: z.number(),
					name: z.string(),
				}),
			)
			.safeParse(c);

		if (!valid.success) {
			console.log("invalid spaces", valid.error);
			return null;
		}

		return valid.data;
	}),
	proMode: parseAsBoolean.withDefault(false),
});
