import { formatTagLabel } from "../lib/formatTag"

// A calm space pill: a small accent dot + the space name on a neutral surface.
export function SpaceChip({ containerTag }: { containerTag: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-bg-muted px-2.5 py-1 text-(length:--text-xs) font-medium text-text-primary">
			<span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
			{formatTagLabel(containerTag)}
		</span>
	)
}
