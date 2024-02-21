import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { env } from "@/env.js";
import * as schema from "./schema";

export const db = drizzle(
  new Database(env.DATABASE_URL, {
    fileMustExist: false,
  }),
  { schema }
);
