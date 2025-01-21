import { TypeOf } from "zod";
import { zodEnv } from "~/lib/environment";

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Env, TypeOf<typeof zodEnv> {}
	}
}
