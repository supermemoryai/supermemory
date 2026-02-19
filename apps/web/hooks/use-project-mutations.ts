"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useProject } from "@/stores"
import type { ContainerTagListType } from "@repo/lib/types"

export function useProjectMutations() {
	const queryClient = useQueryClient()
	const { selectedProjects, setSelectedProjects, setSelectedProject } =
		useProject()

	const createProjectMutation = useMutation({
		mutationFn: async (input: string | { name: string; emoji?: string }) => {
			const { name, emoji } =
				typeof input === "string" ? { name: input, emoji: undefined } : input

			const response = await $fetch("@post/projects", {
				body: { name, emoji },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to create project")
			}

			return response.data
		},
		onSuccess: (data) => {
			toast.success("Project created successfully!")
			queryClient.invalidateQueries({ queryKey: ["projects"] })
			queryClient.invalidateQueries({ queryKey: ["container-tags"] })

			if (data?.containerTag) {
				setSelectedProjects([data.containerTag])
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

			const allTags =
				queryClient.getQueryData<ContainerTagListType[]>(["container-tags"]) ||
				[]
			const deletedProject = allTags.find((p) => p.id === variables.projectId)

			if (
				deletedProject?.containerTag &&
				selectedProjects.includes(deletedProject.containerTag)
			) {
				setSelectedProjects(
					selectedProjects.filter((tag) => tag !== deletedProject.containerTag),
				)
			}

			queryClient.invalidateQueries({ queryKey: ["projects"] })
			queryClient.invalidateQueries({ queryKey: ["container-tags"] })
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
