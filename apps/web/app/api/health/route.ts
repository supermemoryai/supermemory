import { getBackendUrl } from "@/lib/url-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
	const started = performance.now()
	let backend: "ok" | "degraded" | "down" = "ok"
	let backendLatencyMs: number | undefined

	try {
		const response = await fetch(`${getBackendUrl()}/api/auth/health`, {
			signal: AbortSignal.timeout(5_000),
			cache: "no-store",
		})
		backendLatencyMs = Math.round(performance.now() - started)
		if (!response.ok) backend = "degraded"
	} catch {
		backend = "down"
		backendLatencyMs = Math.round(performance.now() - started)
	}

	const status = backend === "ok" ? "ok" : "degraded"
	return Response.json(
		{
			status,
			version: "0.1.0",
			service: "supermemory-web",
			timestamp: new Date().toISOString(),
			dependencies: {
				backend: { status: backend, latencyMs: backendLatencyMs },
			},
		},
		{
			status: backend === "ok" ? 200 : 503,
			headers: { "Cache-Control": "no-store" },
		},
	)
}
