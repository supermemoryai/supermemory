import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { Check, Zap } from "lucide-react"

export function ConnectContent() {
	const isProUser = true
	return (
		<div className="h-full flex flex-col pt-4 space-y-4">
			<div className="flex items-center justify-between px-2">
				<p className="text-[16px] font-semibold">Supermemory Connections</p>
				<span className="bg-[#4BA0FA] text-black text-[12px] font-bold px-1 py-[3px] rounded-[3px]">
					PRO
				</span>
			</div>
			<div className="space-y-3">
				<div className="bg-[#14161A] rounded-[12px] px-4 py-3 flex items-center gap-3">
					<GoogleDrive className="w-6 h-6 text-[#737373]" />
					<div className="space-y-[6px]">
						<p className="text-[16px] font-medium">Google Drive</p>
						<p className="text-[16px] text-[#737373]">
							Connect your Google docs, sheets and slides
						</p>
					</div>
				</div>
				<div className="bg-[#14161A] rounded-[12px] px-4 py-3 flex items-center gap-3">
					<Notion className="w-6 h-6 text-[#737373]" />
					<div className="space-y-[6px]">
						<p className="text-[16px] font-medium">Notion</p>
						<p className="text-[16px] text-[#737373]">
							Import your Notion pages and databases
						</p>
					</div>
				</div>
				<div className="bg-[#14161A] rounded-[12px] px-4 py-3 flex items-center gap-3">
					<OneDrive className="w-6 h-6 text-[#737373]" />
					<div className="space-y-[6px]">
						<p className="text-[16px] font-medium">OneDrive</p>
						<p className="text-[16px] text-[#737373]">
							Access your Microsoft Office documents
						</p>
					</div>
				</div>
			</div>
			<div
				id="no-active-connections"
				className="bg-[#14161A] shadow-inside-out rounded-[12px] px-4 py-6 h-full mb-4 flex flex-col justify-center items-center"
			>
				<Zap className="w-6 h-6 text-[#737373] mb-3" />
				{!isProUser ? (
					<>
						<p className="text-[14px] text-[#737373] mb-4 text-center">
							<a
								href="/pricing"
								className="underline text-[#737373] hover:text-white"
							>
								Upgrade to Pro
							</a>{" "}
							to get
							<br />
							Supermemory Connections
						</p>
						<div className="space-y-2 text-[14px]">
							<div className="flex items-center gap-2">
								<Check className="w-4 h-4 text-[#4BA0FA]" />
								<span>Unlimited memories</span>
							</div>
							<div className="flex items-center gap-2">
								<Check className="w-4 h-4 text-[#4BA0FA]" />
								<span>10 connections</span>
							</div>
							<div className="flex items-center gap-2">
								<Check className="w-4 h-4 text-[#4BA0FA]" />
								<span>Advanced search</span>
							</div>
							<div className="flex items-center gap-2">
								<Check className="w-4 h-4 text-[#4BA0FA]" />
								<span>Priority support</span>
							</div>
						</div>
					</>
				) : (
					<div
						className={cn(
							"text-[#737373] text-center max-w-[174px] font-medium",
							dmSansClassName(),
						)}
					>
						<p>No connections yet</p>
						<p className="text-[12px]">
							Choose a service above to import your knowledge
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
