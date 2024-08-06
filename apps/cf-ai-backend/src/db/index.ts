import { drizzle } from "drizzle-orm/d1";
import { Env } from "../types";

import * as schema from "@repo/db/schema";

export const database = (env: Env) =>
	drizzle(env.DATABASE, { schema, logger: true });
