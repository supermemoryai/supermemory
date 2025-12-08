import { Logo } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"

export function InitialHeader({
	showUserSupermemory,
	name,
}: {
	showUserSupermemory?: boolean
	name?: string
}) {
	return (
		<div className="flex p-6 justify-between items-center">
			<div className="flex items-center">
				<Logo className="h-7" />
				{showUserSupermemory && (
					<div className="flex flex-col items-start justify-center ml-2">
						<p className="text-[#8B8B8B] text-sm leading-tight">{name}'s</p>
						<p className="text-white font-bold text-xl leading-none -mt-1">
							supermemory
						</p>
					</div>
				)}
			</div>
			<Button
				variant="newDefault"
				className="rounded-2xl text-base gap-1 h-11! z-10"
				size={"lg"}
			>
				Memory API <span className="text-xs mt-[4px]">↗</span>
			</Button>
		</div>
	)
}
