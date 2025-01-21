import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "../../packages/db",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.PROD_DATABASE_URL!,
	},
});
