import type { Hono } from "hono"
import type { HonoEnv } from "../types"
import { handleChat } from "./chat"
import { handleMemoryCreation } from "./memory"

/**
 * Register all routes for the OMI <> supermemory app
 */
export function registerRoutes(app: Hono<HonoEnv>) {
	// Health check endpoint
	app.get("/", (c) => {
		return c.json(
			{ message: "supermemory omi integration app is running" },
			200,
		)
	})

	// Memory Creation Trigger endpoint
	app.post("/memory", handleMemoryCreation)

	// Chat endpoint with memory search
	app.post("/chat", handleChat)
}
