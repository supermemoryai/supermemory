import type { TypeOf } from "zod"
import type { zodEnv } from "~/lib/environment"

declare global {
    namespace NodeJS {
        interface ProcessEnv extends Env, TypeOf<typeof zodEnv> {}
    }
}
