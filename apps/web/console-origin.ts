// Portless hosts carry the branch as a prefix, so swap the label instead of rewriting the string.
export function consoleOrigin(hostname: string, protocol = "https:"): string {
	const override = process.env.NEXT_PUBLIC_CONSOLE_URL
	if (override) return override.replace(/\/+$/, "")
	const labels = hostname.split(".")
	const i = labels.indexOf("app")
	if (i !== -1) {
		labels[i] = "console"
		return `${protocol}//${labels.join(".")}`
	}
	return "https://console.supermemory.ai"
}
