"use client"

import { Button } from "@ui/components/button"
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { Search } from "lucide-react"
import { SearchCommand, useCommandK } from "@/components/search-command"

const MOCK_MEMORIES = [
	{ id: "1", title: "Q3 planning notes", desc: "Roadmap, OKRs, hiring plan" },
	{
		id: "2",
		title: "Tauri vs Electron",
		desc: "Why we picked Tauri for the desktop app",
	},
	{
		id: "3",
		title: "Onboarding flow",
		desc: "Detect installed AI tools, one-click connect",
	},
	{
		id: "4",
		title: "SMFS notes",
		desc: "One container, two interfaces (API + folder)",
	},
]

export default function DashboardPage() {
	const { open, setOpen } = useCommandK()

	return (
		<div className="mx-auto w-full max-w-4xl p-8">
			<div className="mb-8 flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Your memories</h1>
					<p className="text-muted-foreground text-sm">
						Everything you have saved, in one place.
					</p>
				</div>
				<Button variant="outline" onClick={() => setOpen(true)}>
					<Search />
					Search
					<kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{MOCK_MEMORIES.map((memory) => (
					<Card
						key={memory.id}
						className="cursor-pointer gap-0 py-5 transition-colors hover:bg-accent/40"
					>
						<CardHeader>
							<CardTitle className="text-base">{memory.title}</CardTitle>
							<CardDescription>{memory.desc}</CardDescription>
						</CardHeader>
					</Card>
				))}
			</div>

			<SearchCommand open={open} onOpenChange={setOpen} />
		</div>
	)
}
