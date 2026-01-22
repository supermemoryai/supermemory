"use client"

import { useAuth } from "@lib/auth-context"
import { LoaderIcon } from "lucide-react"
import { Graph } from "@/components/graph"
import { useProject } from "@/stores"
import { AddMemoryView } from "@/components/views/add-memory"
import { useState } from "react"

export default function GraphPage() {
	const { user } = useAuth()
	const { selectedProject } = useProject()
	const [showAddMemory, setShowAddMemory] = useState(false)

	if (!user) {
		return (
			<div className="h-screen flex items-center justify-center bg-[#000B1B]">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-cyan-500 animate-spin" />
					<p className="text-[#525D6E]">Loading...</p>
				</div>
			</div>
		)
	}

	const containerTags =
		selectedProject && selectedProject !== "sm_project_default"
			? [selectedProject]
			: undefined

	return (
		<div className="h-full w-full bg-[#000B1B]" style={{ background: "radial-gradient(ellipse at center, #01173C 0%, #000B1B 70%)" }}>
			<Graph containerTags={containerTags}>
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="rounded-xl overflow-hidden p-6 text-center">
						<p className="text-[#525D6E] mb-4">No memories found</p>
						<button
							type="button"
							onClick={() => setShowAddMemory(true)}
							className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors underline"
						>
							Add your first memory
						</button>
					</div>
				</div>
			</Graph>

			{showAddMemory && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemory(false)}
				/>
			)}
		</div>
	)
}
