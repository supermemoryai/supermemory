import { dmSans125ClassName, dmSansClassName } from "@/utils/fonts"
import { Dialog, DialogContent, DialogFooter } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronsUpDownIcon, XIcon } from "lucide-react"
import { Button } from "@ui/components/button"

export function MCPModal({
	isOpen,
	onClose,
}: {
	isOpen: boolean
	onClose: () => void
}) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"w-[80%]! max-w-[900px]! h-[80%]! max-h-[600px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-3 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex justify-between h-fit">
					<div className="pl-1 space-y-1">
						<p className={cn("font-semibold", dmSans125ClassName())}>
							Connect your AI to Supermemory
						</p>
						<p className={cn("text-[#737373] font-medium")}>
							Let your AI create and use your memories via MCP. Learn more
						</p>
					</div>
					<div className="flex items-center gap-2">
						<DialogPrimitive.Close
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
							data-slot="dialog-close"
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>
				</div>
				<div className="w-full h-full p-4 rounded-[14px] bg-[#14161A] shadow-inside-out resize-none">
					MCP steps
				</div>
				<DialogFooter className="justify-between!">
					<div className="flex items-center gap-2">
						<Button variant="insideOut">
							My Space <ChevronsUpDownIcon className="size-4" color="#737373" />
						</Button>
						<Button
							variant="ghost"
							className="text-[#737373] cursor-pointer rounded-full"
						>
							Migrate from MCP v1
						</Button>
					</div>
					<Button variant="insideOut" className="px-6 py-[10px]">Done</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
