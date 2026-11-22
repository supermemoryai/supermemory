// Same rules as console-v2's sanitizeContainerTag, so a space created here gets the key the console would give it.
export function sanitizeNamespace(input: string): string {
	return input
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_:-]/g, "")
		.replace(/_{2,}/g, "_")
		.replace(/^[_-]+|[_-]+$/g, "")
		.slice(0, 100)
}

export function isValidNamespace(namespace: string): boolean {
	return (
		namespace.length > 0 &&
		namespace.length <= 100 &&
		/^[a-zA-Z0-9_:-]+$/.test(namespace)
	)
}
