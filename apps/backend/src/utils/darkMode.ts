import { Hono } from "hono";
import { Context } from "hono";
import { Env, Variables } from "../types";

export const toggleDarkMode = async (userId: string, enable: boolean): Promise<void> => {
  // Implement the logic to toggle dark mode for the user
  // This could involve updating a user preference in the database
  // For simplicity, we'll just log the action here
  console.log(`Toggling dark mode for user ${userId}: ${enable ? "enabled" : "disabled"}`);
};

export const initDarkMode = (app: Hono<{ Variables: Variables; Bindings: Env }>) => {
  app.post("/v1/user/dark-mode", async (c: Context<{ Variables: Variables; Bindings: Env }>) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { enable } = await c.req.json();
    await toggleDarkMode(user.id, enable);

    return c.json({ success: true, message: `Dark mode ${enable ? "enabled" : "disabled"}` });
  });
};
