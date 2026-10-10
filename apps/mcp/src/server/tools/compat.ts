import { z } from "zod"
import type {
	NamespaceAccess,
	NamespaceInfo,
	ViewMessage,
} from "../../shared/types"
import { namespaceSchema } from "../namespace"

// Clients that cached the pre-v5 tool list still send and expect containerTag; drop once PostHog shows no containerTag args for 2 weeks.
export const legacyNamespaceInput = {
	containerTag: namespaceSchema
		.optional()
		.describe("Deprecated alias of namespace. Prefer namespace."),
}

export const legacyNamespaceOutput = { containerTag: z.string().optional() }

export const namespaceArg = (args: {
	namespace?: string
	containerTag?: string
}) => args.namespace ?? args.containerTag

export function withLegacyNamespace<T extends { namespace: string }>(value: T) {
	return { ...value, containerTag: value.namespace }
}

export const withLegacyNamespaces = <T extends { namespace: string }>(
	values: T[],
) => values.map(withLegacyNamespace)

const legacyAccess = (values: NamespaceAccess[] | null | undefined) =>
	values ? withLegacyNamespaces(values) : values

const legacyInfos = (values: NamespaceInfo[]) => withLegacyNamespaces(values)

// Mirrors every renamed view field under its pre-v5 name so cached output schemas still validate.
export function withLegacyView(view: ViewMessage): ViewMessage {
	switch (view.view) {
		case "picker":
			return {
				...view,
				namespaces: legacyInfos(view.namespaces),
				containerTags: legacyInfos(view.namespaces),
				activeTag: view.activeNamespace,
				assignedNamespaces: legacyAccess(view.assignedNamespaces),
				assignedTags: legacyAccess(view.assignedNamespaces),
			}
		case "save":
		case "upload":
			return {
				...view,
				activeTag: view.activeNamespace,
				writableTags: view.writableNamespaces,
			}
		case "confirmation":
		case "save-success":
		case "upload-success":
			return { ...view, containerTag: view.namespace }
		case "graph":
			return { ...view, containerTag: view.namespace }
	}
}
