import type { DocumentWithMemories } from "@ui/memory-graph/types"

export const formatDate = (date: string | Date) => {
	const dateObj = new Date(date)
	const now = new Date()
	const currentYear = now.getFullYear()
	const dateYear = dateObj.getFullYear()

	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	]
	const month = monthNames[dateObj.getMonth()]
	const day = dateObj.getDate()

	const getOrdinalSuffix = (n: number) => {
		const s = ["th", "st", "nd", "rd"]
		const v = n % 100
		return n + (s[(v - 20) % 10] || s[v] || s[0] || "th")
	}

	const formattedDay = getOrdinalSuffix(day)

	if (dateYear !== currentYear) {
		return `${month} ${formattedDay}, ${dateYear}`
	}

	return `${month} ${formattedDay}`
}

export const getSourceUrl = (document: DocumentWithMemories) => {
	if (document.type === "google_doc" && document.customId) {
		return `https://docs.google.com/document/d/${document.customId}`
	}
	if (document.type === "google_sheet" && document.customId) {
		return `https://docs.google.com/spreadsheets/d/${document.customId}`
	}
	if (document.type === "google_slide" && document.customId) {
		return `https://docs.google.com/presentation/d/${document.customId}`
	}
	if(document.metadata?.website_url) {
		return document.metadata?.website_url as string
	}
	// Fallback to existing URL for all other document types
	return document.url
}

// Simple hash function for consistent color generation
const hashString = (str: string): number => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32-bit integer
	}
	return Math.abs(hash)
}

// Generate consistent pastel background color based on document ID
export const getPastelBackgroundColor = (
	documentId: string | undefined | null,
): string => {
	// Handle null/undefined cases
	if (!documentId) {
		return "rgba(255, 255, 255, 0.06)" // Default fallback color
	}

	const hash = hashString(documentId)

	// Define pastel color palette with good contrast against dark backgrounds
	const pastelColors = [
		// Soft pinks and roses
		"rgba(255, 182, 193, 0.08)", // Light pink
		"rgba(255, 218, 221, 0.08)", // Misty rose
		"rgba(255, 192, 203, 0.08)", // Pink

		// Soft blues and purples
		"rgba(173, 216, 230, 0.08)", // Light blue
		"rgba(221, 160, 221, 0.08)", // Plum
		"rgba(218, 112, 214, 0.08)", // Orchid
		"rgba(147, 197, 253, 0.08)", // Sky blue

		// Soft greens
		"rgba(152, 251, 152, 0.08)", // Pale green
		"rgba(175, 238, 238, 0.08)", // Pale turquoise
		"rgba(144, 238, 144, 0.08)", // Light green

		// Soft oranges and yellows
		"rgba(255, 218, 185, 0.08)", // Peach puff
		"rgba(255, 239, 213, 0.08)", // Papaya whip
		"rgba(255, 228, 196, 0.08)", // Bisque

		// Soft corals and salmons
		"rgba(250, 128, 114, 0.08)", // Salmon
		"rgba(255, 127, 80, 0.08)", // Coral
		"rgba(255, 160, 122, 0.08)", // Light salmon
	]

	// Use hash to consistently pick a color
	const colorIndex = hash % pastelColors.length
	return pastelColors[colorIndex] || "rgba(255, 255, 255, 0.06)"
}
