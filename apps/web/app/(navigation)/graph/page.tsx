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
			<div className="h-screen flex items-center justify-center bg-slate-900">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p className="text-white/60">Loading...</p>
				</div>
			</div>
		)
	}

	const containerTags =
		selectedProject && selectedProject !== "sm_project_default"
			? [selectedProject]
			: undefined

	return (
		<div className="h-full w-full bg-slate-900">
			<Graph containerTags={containerTags}>
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="rounded-xl overflow-hidden p-6 text-center">
						<p className="text-slate-400 mb-4">No memories found</p>
						<button
							type="button"
							onClick={() => setShowAddMemory(true)}
							className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
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
