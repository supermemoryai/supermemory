import { z } from "zod";

export const zodEnv = z.object({
	// Auth
	WORKOS_CLIENT_ID: z.string(),
	WORKOS_API_KEY: z.string(),
	WORKOS_REDIRECT_URI: z.string(),
	WORKOS_COOKIE_PASSWORD: z.string(),

	DATABASE_URL: z.string(),

	CLOUDFLARE_ACCOUNT_ID: z.string(),
	R2_ACCESS_KEY_ID: z.string(),
	R2_SECRET_ACCESS_KEY: z.string(),
});
