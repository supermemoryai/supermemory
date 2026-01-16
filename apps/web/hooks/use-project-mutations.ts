"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useProject } from "@/stores"

export function useProjectMutations() {
	const queryClient = useQueryClient()
	const { selectedProject, setSelectedProject } = useProject()

	const createProjectMutation = useMutation({
		mutationFn: async (name: string) => {
			const response = await $fetch("@post/projects", {
				body: { name },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to create project")
			}

			return response.data
		},
		onSuccess: (data) => {
			toast.success("Project created successfully!")
			queryClient.invalidateQueries({ queryKey: ["projects"] })

			// Automatically switch to the newly created project
			if (data?.containerTag) {
				setSelectedProject(data.containerTag)
			}
		},
		onError: (error) => {
			toast.error("Failed to create project", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const deleteProjectMutation = useMutation({
		mutationFn: async ({
			projectId,
			action,
			targetProjectId,
		}: {
			projectId: string
			action: "move" | "delete"
			targetProjectId?: string
		}) => {
			const response = await $fetch(`@delete/projects/${projectId}`, {
				body: { action, targetProjectId },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to delete project")
			}

			return response.data
		},
		onSuccess: (_, variables) => {
			toast.success("Project deleted successfully")
			queryClient.invalidateQueries({ queryKey: ["projects"] })

			// If we deleted the selected project, switch to default
			const deletedProject = queryClient
				.getQueryData<any[]>(["projects"])
				?.find((p) => p.id === variables.projectId)
			if (deletedProject?.containerTag === selectedProject) {
				setSelectedProject("sm_project_default")
			}
		},
		onError: (error) => {
			toast.error("Failed to delete project", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const switchProject = (containerTag: string) => {
		setSelectedProject(containerTag)
		toast.success("Project switched successfully")
	}

	return {
		createProjectMutation,
		deleteProjectMutation,
		switchProject,
	}
}
