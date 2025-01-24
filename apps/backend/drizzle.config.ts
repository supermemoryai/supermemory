import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import process from "process";

config();

if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
} else if (process.env.NODE_ENV === "production" && !process.env.PROD_DATABASE_URL) {
	throw new Error("PROD_DATABASE_URL is not set");
}

export default defineConfig({
	dialect: "postgresql",
	schema: "../../packages/db",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.NODE_ENV === "production" ? process.env.PROD_DATABASE_URL! : process.env.DATABASE_URL!,
	},
});
