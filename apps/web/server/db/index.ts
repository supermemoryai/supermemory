import { drizzle } from "drizzle-orm/d1";

import * as schema from "@repo/db/schema";

export const db = drizzle(process.env.DATABASE, {
	schema,
	logger: process.env.NODE_ENV === "development",
});
