import { redirect } from "next/navigation"

function serializeSearchParams(
	sp: Record<string, string | string[] | undefined>,
): string {
	const q = new URLSearchParams()
	for (const [key, value] of Object.entries(sp)) {
		if (value === undefined) continue
		if (Array.isArray(value)) {
			for (const v of value) q.append(key, v)
		} else {
			q.set(key, value)
		}
	}
	return q.toString()
}

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const sp = await searchParams
	const query = serializeSearchParams(sp)
	redirect(query ? `/login?${query}` : "/login")
}
