import { z } from "zod"

export const containerTagSchema = z
	.string()
	.min(1, "Container tag is required")
	.max(128, "Container tag exceeds maximum length")

export const optionalContainerTagSchema = containerTagSchema.optional()
