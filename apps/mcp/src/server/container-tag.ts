import { z } from "zod"

export const containerTagSchema = z
	.string()
	.min(1, "Container tag is required")
	.max(128, "Container tag exceeds maximum length")
	.describe("Workspace key returned by listSpaces")

export const optionalContainerTagSchema = containerTagSchema
	.optional()
	.describe(
		"Workspace key to use for this call. If the user names a workspace, call listSpaces to resolve its key and pass it here. Omit only when the user means the active workspace.",
	)
