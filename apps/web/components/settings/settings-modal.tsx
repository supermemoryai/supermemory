"use client"

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react"
import { useQueryState } from "nuqs"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@ui/components/dialog"
import { X } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import { analytics } from "@/lib/analytics"
import {
	SettingsContent,
	TABS,
	type SettingsTab,
} from "@/components/settings/settings-content"

const SETTINGS_PARAM = "settings"

/** Integrations is a link-out, not a modal tab, so it falls back to account. */
function parseTab(value: string | null): SettingsTab {
	if (
		value &&
		value !== "integrations" &&
		TABS.includes(value as SettingsTab)
	) {
		return value as SettingsTab
	}
	return "account"
}

type SettingsModalContextValue = {
	open: boolean
	openSettings: (tab?: SettingsTab) => void
	close: () => void
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(
	null,
)

export function SettingsModalProvider({ children }: { children: ReactNode }) {
	const [param, setParam] = useQueryState(SETTINGS_PARAM)
	const [settingsDialogContent, setSettingsDialogContent] =
		useState<HTMLDivElement | null>(null)
	const open = param !== null
	const tab = parseTab(param)

	const openSettings = useCallback(
		(next?: SettingsTab) => {
			setParam(next ?? "account")
		},
		[setParam],
	)

	const close = useCallback(() => setParam(null), [setParam])

	const handleTabChange = useCallback(
		(next: SettingsTab) => {
			setParam(next)
			analytics.settingsTabChanged({ tab: next })
		},
		[setParam],
	)

	const value = useMemo(
		() => ({ open, openSettings, close }),
		[open, openSettings, close],
	)

	return (
		<SettingsModalContext.Provider value={value}>
			{children}
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!next) setParam(null)
				}}
			>
				<DialogContent
					ref={setSettingsDialogContent}
					showCloseButton={false}
					style={{
						display: "flex",
						width: "calc(100vw - 1rem)",
						maxWidth: "1160px",
						height: "min(840px, 90vh)",
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
					}}
					className={cn(
						"flex-col min-w-0 border-none bg-[#1B1F24] p-0 gap-0 rounded-[22px] overflow-hidden",
						dmSansClassName(),
					)}
				>
					<div className="flex items-center justify-between gap-4 px-5 md:px-7 pt-5 shrink-0">
						<DialogTitle
							className={cn(
								"font-semibold text-[18px] text-[#fafafa]",
								dmSans125ClassName(),
							)}
						>
							Settings
						</DialogTitle>
						<DialogClose
							className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgba(115,115,115,0.2)] bg-[#0D121A] text-[#737373] transition-colors hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							style={{
								boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
							}}
						>
							<X className="size-3.5" />
							<span className="sr-only">Close</span>
						</DialogClose>
					</div>

					<SettingsContent
						activeTab={tab}
						onTabChange={handleTabChange}
						dialogPortalContainer={settingsDialogContent}
						showIdentity={false}
						className="flex-1 min-h-0 w-full overflow-y-auto md:overflow-hidden px-5 md:px-4 pt-4 pb-6"
					/>
				</DialogContent>
			</Dialog>
		</SettingsModalContext.Provider>
	)
}

export function useSettingsModal() {
	const ctx = useContext(SettingsModalContext)
	if (!ctx) {
		throw new Error(
			"useSettingsModal must be used within a SettingsModalProvider",
		)
	}
	return ctx
}
