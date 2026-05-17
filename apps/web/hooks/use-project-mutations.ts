"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useProject } from "@/stores"
import type { ContainerTagListType, Project } from "@lib/types"
import { DEFAULT_PROJECT_ID } from "@lib/constants"

type ProjectDeleteTarget = {
	id: string
	containerTag: string
	name?: string
}

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
			containerTag,
			action,
			targetProjectId,
		}: {
			projectId: string
			containerTag: string
			action: "move" | "delete"
			targetProjectId?: string
		}) => {
			const response =
				action === "delete"
					? await $fetch(`@delete/container-tags/${containerTag}`)
					: await $fetch(`@delete/projects/${projectId}`, {
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
			const deletedProject =
				variables.action === "delete"
					? { containerTag: variables.containerTag }
					: allTags.find((p) => p.id === variables.projectId)

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

	const deleteProjectsMutation = useMutation({
		mutationFn: async ({ projects }: { projects: ProjectDeleteTarget[] }) => {
			const results = await Promise.allSettled(
				projects.map(async (project) => {
					const response = await $fetch(
						`@delete/container-tags/${project.containerTag}`,
					)

					if (response.error) {
						throw new Error(
							response.error?.message || `Failed to delete ${project.name}`,
						)
					}

					return {
						project,
						data: response.data,
					}
				}),
			)

			return {
				successful: results
					.filter((result) => result.status === "fulfilled")
					.map((result) => result.value),
				failed: results
					.filter((result) => result.status === "rejected")
					.map((result) => result.reason),
			}
		},
		onSuccess: (result, variables) => {
			const deletedTags = new Set(
				result.successful.map(({ project }) => project.containerTag),
			)

			if (selectedProjects.some((tag) => deletedTags.has(tag))) {
				const remainingSelected = selectedProjects.filter(
					(tag) => !deletedTags.has(tag),
				)
				setSelectedProjects(
					remainingSelected.length > 0
						? remainingSelected
						: [DEFAULT_PROJECT_ID],
				)
			}

			queryClient.invalidateQueries({ queryKey: ["projects"] })
			queryClient.invalidateQueries({ queryKey: ["container-tags"] })

			if (result.failed.length > 0) {
				toast.error(
					`Deleted ${result.successful.length} of ${variables.projects.length} spaces`,
					{
						description:
							result.failed[0] instanceof Error
								? result.failed[0].message
								: "Some spaces could not be deleted.",
					},
				)
				return
			}

			toast.success(
				variables.projects.length === 1
					? "Space deleted successfully"
					: `${variables.projects.length} spaces deleted successfully`,
			)
		},
		onError: (error) => {
			toast.error("Failed to delete spaces", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const updateProjectMutation = useMutation({
		mutationFn: async ({
			containerTag,
			name,
		}: {
			containerTag: string
			name: string
		}) => {
			const response = await $fetch(`@patch/container-tags/${containerTag}`, {
				body: { name },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to update project")
			}

			const data = response.data as
				| { containerTag?: string; name?: string | null }
				| undefined

			return {
				containerTag: data?.containerTag ?? containerTag,
				name: data?.name ?? name,
			}
		},
		onMutate: async (variables) => {
			await Promise.all([
				queryClient.cancelQueries({ queryKey: ["projects"] }),
				queryClient.cancelQueries({ queryKey: ["container-tags"] }),
			])

			const previousProjects = queryClient.getQueryData<Project[]>(["projects"])
			const previousContainerTags = queryClient.getQueryData<
				ContainerTagListType[]
			>(["container-tags"])

			queryClient.setQueryData<Project[]>(["projects"], (current) =>
				current?.map((project) =>
					project.containerTag === variables.containerTag
						? { ...project, name: variables.name }
						: project,
				),
			)
			queryClient.setQueryData<ContainerTagListType[]>(
				["container-tags"],
				(current) =>
					current?.map((project) =>
						project.containerTag === variables.containerTag
							? { ...project, name: variables.name }
							: project,
					),
			)

			return { previousProjects, previousContainerTags }
		},
		onSuccess: (data) => {
			if (!data) return
			queryClient.setQueryData<Project[]>(["projects"], (current) =>
				current?.map((project) =>
					project.containerTag === data.containerTag
						? { ...project, name: data.name }
						: project,
				),
			)
			queryClient.setQueryData<ContainerTagListType[]>(
				["container-tags"],
				(current) =>
					current?.map((project) =>
						project.containerTag === data.containerTag
							? { ...project, name: data.name }
							: project,
					),
			)
			toast.success("Space renamed")
		},
		onError: (error, _variables, context) => {
			if (context?.previousProjects) {
				queryClient.setQueryData(["projects"], context.previousProjects)
			}
			if (context?.previousContainerTags) {
				queryClient.setQueryData(
					["container-tags"],
					context.previousContainerTags,
				)
			}
			toast.error("Failed to rename space", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] })
			queryClient.invalidateQueries({ queryKey: ["container-tags"] })
		},
	})

	const switchProject = (containerTag: string) => {
		setSelectedProject(containerTag)
		toast.success("Project switched successfully")
	}

	return {
		createProjectMutation,
		deleteProjectMutation,
		deleteProjectsMutation,
		updateProjectMutation,
		switchProject,
	}
}
