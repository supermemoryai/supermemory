/** Tool safety hints for hosts like ChatGPT that surface annotation metadata. */
export const READ_ONLY_TOOL_ANNOTATIONS = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
}

export const MEMORY_TOOL_ANNOTATIONS = {
	readOnlyHint: false,
	destructiveHint: true,
	idempotentHint: false,
	openWorldHint: false,
}

export const ADDITIVE_MEMORY_TOOL_ANNOTATIONS = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: false,
	openWorldHint: false,
}

/** Non-destructive account/session mutations, e.g. switching the active space. */
export const SETTINGS_TOOL_ANNOTATIONS = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
}
