// "sm_project_eng_rfcs" → "Eng Rfcs"
export function formatNamespaceLabel(raw: string): string {
	const slug = raw.replace(/^sm_project_/i, "").replace(/^sm_/i, "")

	return slug
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ")
}
