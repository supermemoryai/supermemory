import { NextResponse } from "next/server"
import { resolveSupermemoryApiKey } from "@/lib/api-keys"
import { fetchContainerContext } from "@/lib/context-api"
import {
	PlaygroundRequestError,
	assertTrustedBrowserRequest,
	mayUseEnvironmentKeys,
	parseApiKeys,
	parseContainerTag,
	parseOptionalText,
	readJsonObject,
} from "@/lib/request-validation"

export async function GET(req: Request) {
	try {
		assertTrustedBrowserRequest(req)
		const { searchParams } = new URL(req.url)
		const containerTag = parseContainerTag(searchParams.get("containerTag"))
		const query = parseOptionalText(searchParams.get("query"), "query")
		const supermemoryApiKey = resolveSupermemoryApiKey(null, {
			allowEnvironment: mayUseEnvironmentKeys(req),
		})

		if (!supermemoryApiKey) {
			return NextResponse.json(
				{
					ok: false,
					error:
						"Supermemory API key is required — enter it in the dashboard or set a local env var.",
				},
				{ status: 400 },
			)
		}

		const context = await fetchContainerContext(
			containerTag,
			query,
			supermemoryApiKey,
		)
		return NextResponse.json({ ok: true, context })
	} catch (error) {
		const status = error instanceof PlaygroundRequestError ? error.status : 500
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status },
		)
	}
}

export async function POST(req: Request) {
	try {
		assertTrustedBrowserRequest(req)
		const body = await readJsonObject(req)
		const containerTag = parseContainerTag(body.containerTag)
		const query = parseOptionalText(body.query, "query")
		const supermemoryApiKey = resolveSupermemoryApiKey(
			parseApiKeys(body.apiKeys),
			{ allowEnvironment: mayUseEnvironmentKeys(req) },
		)

		if (!supermemoryApiKey) {
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
			supermemoryApiKey,
		)
		return NextResponse.json({ ok: true, context })
	} catch (error) {
		const status = error instanceof PlaygroundRequestError ? error.status : 500
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status },
		)
	}
}
