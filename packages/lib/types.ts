/**
 * Common TypeScript types shared across the application
 */

export interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
}
