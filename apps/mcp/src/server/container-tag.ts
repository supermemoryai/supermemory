import { z } from "zod"

export const containerTagSchema = z
	.string()
	.min(1, "Container tag is required")
	.max(128, "Container tag exceeds maximum length")
	.describe("Space key returned by list_spaces")

export const optionalContainerTagSchema = containerTagSchema
	.optional()
	.describe(
		"Space key to use for this call. If the user names a space, call list_spaces to resolve its key and pass it here. If no space is named, omit this field so the server uses the active space or account default.",
	)
