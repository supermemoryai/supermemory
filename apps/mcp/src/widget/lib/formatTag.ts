/**
 * Turns a raw container-tag identifier into a human-friendly label.
 *
 * "sm_project_marketing"   → "Marketing"
 * "sm_project_eng_rfcs"    → "Eng Rfcs"
 * "my_custom_workspace"    → "My Custom Workspace"
 */
export function formatTagLabel(raw: string): string {
	const slug = raw.replace(/^sm_project_/i, "").replace(/^sm_/i, "")

	return slug
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ")
}
