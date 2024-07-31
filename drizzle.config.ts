import { type Config } from "drizzle-kit";

export default {
	schema: "./packages/db/schema.ts",
	dialect: "sqlite",
	driver: "d1",
	dbCredentials: {
		wranglerConfigPath: "./apps/web/wrangler.toml",
		dbName: "",
	},
	out: "migrations",
} satisfies Config;
