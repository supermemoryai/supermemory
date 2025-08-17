"use client"

import { Button } from "@repo/ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useState } from "react"
import { useProjectMutations } from "@/hooks/use-project-mutations"

interface CreateProjectDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
	const [projectName, setProjectName] = useState("")
	const { createProjectMutation } = useProjectMutations()

	const handleClose = () => {
		onOpenChange(false)
		setProjectName("")
	}

	const handleCreate = () => {
		if (projectName.trim()) {
			createProjectMutation.mutate(projectName, {
				onSuccess: () => {
					handleClose()
				}
			})
		}
	}

	return (
		<AnimatePresence>
			{open && (
				<Dialog open={open} onOpenChange={onOpenChange}>
					<DialogContent className="sm:max-w-2xl bg-[#0f1419] backdrop-blur-xl border-white/10 text-white">
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
						>
							<DialogHeader>
								<DialogTitle>Create New Project</DialogTitle>
								<DialogDescription className="text-white/60">
									Give your project a unique name
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 }}
									className="flex flex-col gap-2"
								>
									<Label htmlFor="projectName">Project Name</Label>
									<Input
										id="projectName"
										className="bg-white/5 border-white/10 text-white"
										placeholder="My Awesome Project"
										value={projectName}
										onChange={(e) => setProjectName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && projectName.trim()) {
												handleCreate()
											}
										}}
									/>
									<p className="text-xs text-white/50">
										This will help you organize your memories
									</p>
								</motion.div>
							</div>
							<DialogFooter>
								<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
									<Button
										type="button"
										variant="outline"
										className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
										onClick={handleClose}
									>
										Cancel
									</Button>
								</motion.div>
								<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
									<Button
										type="button"
										className="bg-white/10 hover:bg-white/20 text-white border-white/20"
										disabled={createProjectMutation.isPending || !projectName.trim()}
										onClick={handleCreate}
									>
										{createProjectMutation.isPending ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
												Creating...
											</>
										) : (
											"Create Project"
										)}
									</Button>
								</motion.div>
							</DialogFooter>
						</motion.div>
					</DialogContent>
				</Dialog>
			)}
		</AnimatePresence>
	)
}
