import { drizzle } from 'drizzle-orm/d1';

import * as schema from "./schema";

export const db = drizzle(
    process.env.DATABASE as unknown as D1Database,
  { schema }
);
