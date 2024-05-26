import { type Config } from "drizzle-kit";

export default {
  schema: "./app/helpers/server/db/schema.ts",
  dialect: "sqlite",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "./wrangler.toml",
    dbName: "",
  },
  out: "migrations",
} satisfies Config;
