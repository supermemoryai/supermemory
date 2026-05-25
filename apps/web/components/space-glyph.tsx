import { cn } from "@lib/utils"
import { SpaceFolderIcon } from "./space-folder-icon"

export function SpaceGlyph({
	emoji,
	size = 16,
	className,
}: {
	emoji?: string | null
	size?: number
	className?: string
}) {
	if (!emoji || emoji === "📁") {
		return <SpaceFolderIcon size={size} className={cn("shrink-0", className)} />
	}
	return (
		<span
			className={cn("shrink-0 leading-none", className)}
			style={{ fontSize: size }}
		>
			{emoji}
		</span>
	)
}
