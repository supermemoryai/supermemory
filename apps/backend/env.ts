import { env } from "cloudflare:workers"
import { createEnv } from "@t3-oss/env-core"
import { string } from "valibot"

export const backendEnv = createEnv({
    server: {
        WORKOS_CLIENT_ID: string(),
        WORKOS_API_KEY: string(),
        WORKOS_REDIRECT_URI: string(),
        WORKOS_COOKIE_PASSWORD: string(),
        DATABASE_URL: string(),
        GEMINI_API_KEY: string(),
        OPEN_AI_API_KEY: string(),
        RESEND_API_KEY: string(),
        TURNSTILE_SECRET_KEY: string(),
        BRAINTRUST_API_KEY: string(),
    },

    clientPrefix: "PUBLIC_",

    client: {},

    runtimeEnv: process.env,

    emptyStringAsUndefined: true,
})
