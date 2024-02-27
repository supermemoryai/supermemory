import { drizzle } from 'drizzle-orm/d1';

import * as schema from "./schema";

console.log(process.env.DATABASE);

export const db = drizzle(
  process.env.DATABASE,
  { schema, logger: true }
);
