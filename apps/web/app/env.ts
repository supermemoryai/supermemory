import process from "node:process"
import { createEnv } from "@t3-oss/env-core"
import { string } from "valibot"

export const webEnv = createEnv({
    server: {
        WORKOS_CLIENT_ID: string(),
        WORKOS_API_KEY: string(),
        WORKOS_REDIRECT_URI: string(),
        WORKOS_COOKIE_PASSWORD: string(),

        DATABASE_URL: string(),

        CLOUDFLARE_ACCOUNT_ID: string(),
        R2_ACCESS_KEY_ID: string(),
        R2_SECRET_ACCESS_KEY: string(),
    },

    clientPrefix: "PUBLIC_",

    client: {},

    runtimeEnv: process.env,

    emptyStringAsUndefined: true,
})
