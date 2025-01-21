import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import process from "node:process";
import postgres from "postgres";

config();

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const connectionString = process.env.DATABASE_URL!;

console.log("Connecting to:", connectionString.replace(/:[^:@]+@/, ":****@")); // Log sanitized connection string

const migrationClient = postgres(connectionString, { max: 1 });

async function main() {
	console.log("Running migrations...");

	try {
		const db = drizzle(migrationClient);
		await migrate(db, { migrationsFolder: "./drizzle" });
		console.log("Migrations completed!");
	} catch (error) {
		console.error("Migration failed:", error);
	} finally {
		await migrationClient.end();
	}
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
