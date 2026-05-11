import { DEFAULT_PROJECT_ID } from "@lib/constants"
import type { ContainerTagListType } from "@lib/types"

/**
 * Spaces auto-created on first ingest use `name === \`Space ${containerTag}\``
 * (mono `apps/api/src/routes/memories/handler-effect.ts`). Those are noisy in the
 * UI; we sort them after everything else — no per-tool heuristics.
 */
export function isIngestAutoProvisionedSpace(
	p: Pick<ContainerTagListType, "name" | "containerTag">,
): boolean {
	if (p.containerTag === DEFAULT_PROJECT_ID) return false
	return (p.name ?? "") === `Space ${p.containerTag}`
}

/** Normal / named spaces first; auto-ingest `Space {tag}` rows last. */
export function compareSpacesUserFirst(
	a: Pick<ContainerTagListType, "name" | "containerTag">,
	b: Pick<ContainerTagListType, "name" | "containerTag">,
): number {
	return (
		Number(isIngestAutoProvisionedSpace(a)) -
		Number(isIngestAutoProvisionedSpace(b))
	)
}

export function spaceSelectorDisplayName(
	p: Pick<ContainerTagListType, "name" | "containerTag"> | undefined,
	fallback: string,
): string {
	if (!p) return fallback
	const name = p.name ?? p.containerTag
	const long = name.length > 44
	if (long) {
		return `${name.slice(0, 42)}…`
	}
	return name
}
