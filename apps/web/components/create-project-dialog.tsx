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
import { Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useProjectMutations } from "@/hooks/use-project-mutations"

interface CreateProjectDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({
	open,
	onOpenChange,
}: CreateProjectDialogProps) {
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
				},
			})
		}
	}

	return (
		<AnimatePresence>
			{open && (
				<Dialog onOpenChange={onOpenChange} open={open}>
					<DialogContent className="sm:max-w-2xl backdrop-blur-xl">
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							initial={{ opacity: 0, scale: 0.95 }}
						>
							<DialogHeader>
								<DialogTitle>Create New Project</DialogTitle>
								<DialogDescription>
									Give your project a unique name
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<motion.div
									animate={{ opacity: 1, y: 0 }}
									className="flex flex-col gap-2"
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.1 }}
								>
									<Input
										id="projectName"
										onChange={(e) => setProjectName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && projectName.trim()) {
												handleCreate()
											}
										}}
										placeholder="My Awesome Project"
										value={projectName}
									/>
									<p className="text-xs">
										This will help you organize your memories
									</p>
								</motion.div>
							</div>
							<DialogFooter>
								<Button onClick={handleClose} type="button" variant="outline">
									Cancel
								</Button>
								<Button
									disabled={
										createProjectMutation.isPending || !projectName.trim()
									}
									onClick={handleCreate}
									type="button"
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
							</DialogFooter>
						</motion.div>
					</DialogContent>
				</Dialog>
			)}
		</AnimatePresence>
	)
}
