export interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
	emoji?: string
}

export interface ContainerTagListType extends Project {
	isExperimental: boolean
	isNova: boolean
}
