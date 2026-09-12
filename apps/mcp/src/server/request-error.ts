// Failures inside the MCP request handler (beyond the auth gate) surface only
// through `createMcpHandler`'s `onerror` callback. The SDK routes every non-Error
// throw through `new Error(String(value))` and Cloudflare's `console.error`
// renders an `Error` as its stack alone, so `console.error("MCP request error:", error)`
// drops the cause entirely when the message is empty and produces a stack with no
// text for anything that wasn't thrown as a well-formed Error. This turns any
// thrown value into a single, always-informative line so the producing failure is
// visible in telemetry instead of being elided.

function readField(value: object, key: string): unknown {
	try {
		return Reflect.get(value, key)
	} catch {
		return undefined
	}
}

function readNumber(value: object, key: string): number | undefined {
	const field = readField(value, key)
	return typeof field === "number" && Number.isFinite(field) ? field : undefined
}

function stringifyScalar(value: unknown): string {
	if (typeof value === "string") return value
	if (typeof value === "bigint") return `${value}n`
	return String(value)
}

function safeStringify(value: object): string {
	try {
		const json = JSON.stringify(value)
		if (json !== undefined && json !== "{}") return json
	} catch {
		// Fall through to the non-JSON representation (e.g. circular references).
	}
	try {
		return String(value)
	} catch {
		return "[unserializable value]"
	}
}

// Renders any thrown value into a stable, single description that always carries
// a cause. The exact "MCP request error" prefix stays with the caller so the
// existing log-based monitoring keeps matching; this only fills in the part that
// was previously blank.
export function describeThrownError(error: unknown): string {
	if (error instanceof Error) {
		const name = error.name || "Error"
		const message = error.message || "(no message)"

		const details: string[] = []
		const status = readNumber(error, "status")
		if (status !== undefined) details.push(`status=${status}`)
		const code = readField(error, "code")
		if (
			code !== undefined &&
			(typeof code === "string" || typeof code === "number")
		) {
			details.push(`code=${stringifyScalar(code)}`)
		}
		const suffix = details.length > 0 ? ` (${details.join(", ")})` : ""

		const cause = error.cause
		const causeSuffix =
			cause instanceof Error
				? ` caused by ${cause.name || "Error"}: ${cause.message || "(no message)"}`
				: ""

		const stack = error.stack ? `\n${error.stack}` : ""
		return `${name}: ${message}${suffix}${causeSuffix}${stack}`
	}

	if (error === undefined) return "non-Error value thrown: undefined"
	if (error === null) return "non-Error value thrown: null"
	if (typeof error === "object") {
		return `non-Error value thrown (object): ${safeStringify(error)}`
	}
	return `non-Error value thrown (${typeof error}): ${stringifyScalar(error)}`
}
