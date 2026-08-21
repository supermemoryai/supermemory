type PluginKeyDeleteResult = {
	data: unknown
	error: { message?: string } | null
}

type RevokePluginKeyOptions = {
	deleteKey: () => Promise<PluginKeyDeleteResult>
	onSuccess: () => void
	refetch: () => void
}

export async function revokePluginKey({
	deleteKey,
	onSuccess,
	refetch,
}: RevokePluginKeyOptions): Promise<void> {
	const result = await deleteKey()
	if (result.error) {
		throw new Error(result.error.message ?? "Failed to disconnect plugin")
	}

	onSuccess()
	refetch()
}
