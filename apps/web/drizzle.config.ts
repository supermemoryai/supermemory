import { type Config } from "drizzle-kit";

const localDb = {
  url: process.env.LOCAL_DB_URL!,
};

export default {
  schema: "./src/server/db/schema.ts",
  driver: process.env.LOCAL_DB_URL ? "better-sqlite" : "d1",
  dbCredentials: process.env.LOCAL_DB_URL
    ? localDb
    : {
        wranglerConfigPath: "./wrangler.toml",
        dbName: "dev-d1-anycontext",
      },
  out: "drizzle",
} satisfies Config;
