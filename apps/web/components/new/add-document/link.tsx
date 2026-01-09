import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/utils/fonts"

export function LinkContent() {
	return (
		<div className={cn("flex flex-col space-y-4 pt-4", dmSansClassName())}>
			<div>
				<p
					className={cn("text-[16px] font-medium pl-2 pb-2", dmSansClassName())}
				>
					Paste a link to turn it into a memory
				</p>
				<div className="flex relative">
					<input
						type="text"
						placeholder="https://maheshthedev.me"
						className={cn(
							"w-full p-4 rounded-xl bg-[#14161A] shadow-inside-out",
						)}
					/>
					<Button variant="linkPreview" className="absolute right-2 top-2">
						Preview Link
					</Button>
				</div>
			</div>
			<div className="bg-[#14161A] rounded-[14px] py-6 px-4 space-y-4 shadow-inside-out">
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link title
					</p>
					<input
						type="text"
						placeholder="Mahesh Sanikommu - Portfolio"
						className="w-full px-4 py-3 bg-[#0F1217] rounded-xl"
					/>
				</div>
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link description
					</p>
					<textarea
						placeholder="Portfolio website of Mahesh Sanikommu"
						className="w-full px-4 py-3 bg-[#0F1217] rounded-xl"
					/>
				</div>
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link Preview
					</p>
					<div className="w-full px-4 py-3 bg-[#0F1217] rounded-xl">
						<p>Portfolio website of Mahesh Sanikommu</p>
					</div>
				</div>
			</div>
		</div>
	)
}
