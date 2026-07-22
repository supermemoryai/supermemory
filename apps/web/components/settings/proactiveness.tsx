"use client"

import { cn } from "@lib/utils"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { dmSans125ClassName } from "@/lib/fonts"
import CompanyBrainAutomations from "./company-brain-automations"

export default function Proactiveness() {
	const isCompanyBrain = useHasCompanyBrain()

	if (!isCompanyBrain) {
		return (
			<div className="px-1 pt-2">
				<p className={cn(dmSans125ClassName(), "text-[13px] text-[#6B6B6B]")}>
					Company Brain isn't enabled for this organization.
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-6">
			<CompanyBrainAutomations />
		</div>
	)
}
