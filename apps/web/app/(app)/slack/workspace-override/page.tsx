import { Suspense } from "react"
import { SlackWorkspaceOverride } from "@/components/slack-workspace-override"

function OverrideLoading() {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-[#08090C] p-4">
			<output className="flex items-center gap-3 text-[13px] text-[#9AA0A6]">
				<span
					aria-hidden="true"
					className="size-6 animate-spin rounded-full border-2 border-[#C73B1B]/30 border-t-[#C73B1B] motion-reduce:animate-none"
				/>
				<span className="sr-only">Loading Slack reassignment request</span>
			</output>
		</div>
	)
}

export default function SlackWorkspaceOverridePage() {
	return (
		<Suspense fallback={<OverrideLoading />}>
			<SlackWorkspaceOverride />
		</Suspense>
	)
}
