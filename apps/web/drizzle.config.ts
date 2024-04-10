import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "./wrangler.toml",
    dbName: "dev-d1-anycontext",
  },
  out: "drizzle",
} satisfies Config;
