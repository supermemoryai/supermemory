"use client"

import { Header } from "@/components/new/header"
import { ChatSidebar } from "@/components/new/chat-sidebar"
import { AnimatePresence } from "motion/react"
import { MemoriesGrid } from "@/components/new/memories-grid"

export default function NewPage() {
	return (
		<div className="min-h-screen bg-black">
			<Header />
			<main className="relative">
				<div className="relative z-10">
					<div className="flex flex-row h-[calc(100vh-90px)] relative">
						<div className="flex-1 flex flex-col justify-start p-6 pr-0">
							<MemoriesGrid />
						</div>

						<AnimatePresence mode="popLayout">
							<ChatSidebar />
						</AnimatePresence>
					</div>
				</div>
			</main>
		</div>
	)
}