import { useQuery } from "@tanstack/react-query"
import { $fetch } from "@lib/api"

// List endpoint truncates `content` to ~2000 chars; fetch the full doc by id for the viewer.
export function useFullDocumentContent(
	documentId: string | null | undefined,
	enabled: boolean,
): string | null {
	const isReal = !!documentId && !documentId.startsWith("temp-")

	const { data } = useQuery({
		queryKey: ["document-full", documentId],
		enabled: enabled && isReal,
		staleTime: 5 * 60 * 1000,
		queryFn: async () => {
			const res = await $fetch("@get/documents/:id", {
				params: { id: documentId as string },
				disableValidation: true,
			})
			if (res.error) {
				throw new Error(res.error?.message || "Failed to fetch document")
			}
			const doc = res.data as { content?: string | null } | null
			return typeof doc?.content === "string" ? doc.content : null
		},
	})

	return data ?? null
}
