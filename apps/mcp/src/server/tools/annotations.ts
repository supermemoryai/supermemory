/** Tool safety hints for hosts like ChatGPT that surface annotation metadata. */
export const READ_ONLY_TOOL_ANNOTATIONS = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
} as const

export const MEMORY_TOOL_ANNOTATIONS = {
	readOnlyHint: false,
	destructiveHint: true,
	idempotentHint: false,
	openWorldHint: false,
} as const

/** Non-destructive account/session mutations, e.g. switching the active space. */
export const SETTINGS_TOOL_ANNOTATIONS = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
} as const
