export interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
	emoji?: string
	visibility?: "public" | "private" | "unlisted"
}

export interface ContainerTagListType extends Project {
	isExperimental: boolean
	isNova: boolean
}
