import { zodEnv } from "./environment";

import process from "node:process";
import { z } from "zod";

try {
	zodEnv.parse(process.env);
} catch (err) {
	if (process.env.NODE_ENV === "production") {
		// do nothihng
		console.log("production");
	} else if (err instanceof z.ZodError) {
		const { fieldErrors } = err.flatten();
		const errorMessage = Object.entries(fieldErrors)
			.map(([field, errors]) => (errors ? `${field}: ${errors.join(", ")}` : field))
			.join("\n  ");
		throw new Error(`Missing environment variables:\n  ${errorMessage}`);
	}
}
