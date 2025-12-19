import { Hono } from "hono"
import type { HonoEnv } from "./types"
import { registerRoutes } from "./routes"

const app = new Hono<HonoEnv>()

// Register all routes
registerRoutes(app)

export default app
