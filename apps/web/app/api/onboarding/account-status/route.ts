type AccountSource = "x" | "linkedin"

type ParsedAccount = {
	handle: string
	url: string
}

function parseXAccount(value: string): ParsedAccount | null {
	const trimmed = value.trim()
	if (!trimmed) return null

	let handle = trimmed.replace(/^@/, "")
	const lowerValue = handle.toLowerCase()

	if (lowerValue.includes("x.com") || lowerValue.includes("twitter.com")) {
		try {
			const url = new URL(
				handle.startsWith("http://") || handle.startsWith("https://")
					? handle
					: `https://${handle}`,
			)
			handle = url.pathname.split("/").filter(Boolean)[0] ?? ""
		} catch {
			handle = handle.match(/(?:x\.com|twitter\.com)\/([^/\s?#]+)/i)?.[1] ?? ""
		}
	}

	handle = handle.replace(/^@/, "").split(/[/?#]/)[0] ?? ""
	if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null

	return { handle, url: `https://x.com/${handle}` }
}

function parseLinkedInAccount(value: string): ParsedAccount | null {
	const trimmed = value.trim()
	if (!trimmed) return null

	try {
		const url = new URL(
			trimmed.startsWith("http://") || trimmed.startsWith("https://")
				? trimmed
				: `https://${trimmed}`,
		)
		const match = url.pathname.match(/\/(in|pub)\/([^/\s?#]+)/i)
		const handle = match?.[2]
		if (!handle) return null

		return {
			handle,
			url: `https://www.linkedin.com/${match[1]?.toLowerCase()}/${handle}`,
		}
	} catch {
		const match = trimmed.match(/linkedin\.com\/(in|pub)\/([^/\s?#]+)/i)
		const handle = match?.[2]
		if (!handle) return null

		return {
			handle,
			url: `https://www.linkedin.com/${match[1]?.toLowerCase()}/${handle}`,
		}
	}
}

function parseAccount(
	source: AccountSource,
	value: string,
): ParsedAccount | null {
	return source === "x" ? parseXAccount(value) : parseLinkedInAccount(value)
}

function looksUnavailable(source: AccountSource, html: string) {
	const lowerHtml = html.toLowerCase()
	if (source === "x") {
		return (
			lowerHtml.includes("this account doesn") ||
			lowerHtml.includes("account suspended") ||
			lowerHtml.includes("profile not found")
		)
	}

	return (
		lowerHtml.includes("profile not found") ||
		lowerHtml.includes("page not found") ||
		lowerHtml.includes("this linkedin profile is unavailable")
	)
}

function linkedinFallback(account: ParsedAccount, status?: number) {
	return Response.json({
		found: null,
		verified: false,
		reason: "unable_to_verify_linkedin",
		handle: account.handle,
		status,
		url: account.url,
	})
}

async function verifyXAccount(account: ParsedAccount, signal: AbortSignal) {
	const oembedUrl = new URL("https://publish.twitter.com/oembed")
	oembedUrl.searchParams.set("url", account.url)

	const response = await fetch(oembedUrl, {
		signal,
		headers: {
			Accept: "application/json",
			"User-Agent":
				"Mozilla/5.0 (compatible; SuperMemory/1.0; +https://supermemory.ai)",
		},
	})

	if (response.status === 404 || response.status === 410) {
		return Response.json({
			found: false,
			handle: account.handle,
			status: response.status,
			url: account.url,
		})
	}

	if (!response.ok) {
		return Response.json(
			{
				error: "Unable to verify account",
				handle: account.handle,
				status: response.status,
				url: account.url,
			},
			{ status: 502 },
		)
	}

	return Response.json({
		found: true,
		handle: account.handle,
		status: response.status,
		url: account.url,
	})
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const source = searchParams.get("source")
	const value = searchParams.get("value")

	if (source !== "x" && source !== "linkedin") {
		return Response.json({ error: "Invalid account source" }, { status: 400 })
	}

	if (!value?.trim()) {
		return Response.json({ error: "Missing account value" }, { status: 400 })
	}

	const account = parseAccount(source, value)
	if (!account) {
		return Response.json({ found: false, reason: "invalid" }, { status: 400 })
	}

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 7000)

	try {
		if (source === "x") {
			return await verifyXAccount(account, controller.signal)
		}

		const response = await fetch(account.url, {
			signal: controller.signal,
			redirect: "follow",
			headers: {
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"User-Agent":
					"Mozilla/5.0 (compatible; SuperMemory/1.0; +https://supermemory.ai)",
			},
		})

		if (response.status === 404 || response.status === 410) {
			return Response.json({
				found: false,
				handle: account.handle,
				status: response.status,
				url: account.url,
			})
		}

		if (!response.ok) {
			if (source === "linkedin") {
				return linkedinFallback(account, response.status)
			}

			return Response.json(
				{
					error: "Unable to verify account",
					handle: account.handle,
					status: response.status,
					url: account.url,
				},
				{ status: 502 },
			)
		}

		const html = await response.text()
		const found = !looksUnavailable(source, html)

		return Response.json({
			found,
			handle: account.handle,
			status: response.status,
			url: account.url,
		})
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			if (source === "linkedin") {
				return linkedinFallback(account)
			}

			return Response.json(
				{ error: "Account lookup timed out", handle: account.handle },
				{ status: 504 },
			)
		}

		console.error("Account status lookup failed:", error)
		if (source === "linkedin") {
			return linkedinFallback(account)
		}

		return Response.json(
			{ error: "Unable to verify account", handle: account.handle },
			{ status: 502 },
		)
	} finally {
		clearTimeout(timeoutId)
	}
}
