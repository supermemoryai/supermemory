export function preparePromptForSubmission(
	promptContent: string,
	storedMemories?: string,
	memorySeparator = "",
) {
	const shouldIncludeMemories =
		storedMemories && !promptContent.includes("Supermemories of user")

	return {
		promptToCapture: promptContent,
		promptToSubmit: shouldIncludeMemories
			? `${promptContent}${memorySeparator}${storedMemories}`
			: promptContent,
	}
}
