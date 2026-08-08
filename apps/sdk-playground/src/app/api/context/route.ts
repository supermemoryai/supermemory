import { NextResponse } from "next/server"
import { resolveApiKeys } from "@/lib/api-keys"
import { fetchContainerContext } from "@/lib/context-api"

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const containerTag = searchParams.get("containerTag") ?? "sdk-playground"
	const query = searchParams.get("query") ?? undefined
	const apiKeys = resolveApiKeys()

	if (!apiKeys) {
		return NextResponse.json(
			{
				ok: false,
				error: "Supermemory API key is required — enter it in the dashboard or set env vars.",
			},
			{ status: 400 },
		)
	}

	try {
		const context = await fetchContainerContext(
			containerTag,
			query || undefined,
			apiKeys.supermemoryApiKey,
		)
		return NextResponse.json({ ok: true, context })
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		)
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const containerTag = String(body.containerTag ?? "sdk-playground")
		const query = body.query ? String(body.query) : undefined
		const apiKeys = resolveApiKeys(body.apiKeys)

		if (!apiKeys) {
			return NextResponse.json(
				{
					ok: false,
					error: "Supermemory API key is required — enter it in the dashboard.",
				},
				{ status: 400 },
			)
		}

		const context = await fetchContainerContext(
			containerTag,
			query,
			apiKeys.supermemoryApiKey,
		)
		return NextResponse.json({ ok: true, context })
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		)
	}
}
