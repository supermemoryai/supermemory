import type { DocumentWithMemories } from "@ui/memory-graph/types";

export const formatDate = (date: string | Date) => {
	const dateObj = new Date(date);
	const now = new Date();
	const currentYear = now.getFullYear();
	const dateYear = dateObj.getFullYear();

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
	];
	const month = monthNames[dateObj.getMonth()];
	const day = dateObj.getDate();

	const getOrdinalSuffix = (n: number) => {
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]!);
	};

	const formattedDay = getOrdinalSuffix(day);

	if (dateYear !== currentYear) {
		return `${month} ${formattedDay}, ${dateYear}`;
	}

	return `${month} ${formattedDay}`;
};

export const getSourceUrl = (document: DocumentWithMemories) => {
	if (document.type === "google_doc" && document.customId) {
		return `https://docs.google.com/document/d/${document.customId}`;
	}
	if (document.type === "google_sheet" && document.customId) {
		return `https://docs.google.com/spreadsheets/d/${document.customId}`;
	}
	if (document.type === "google_slide" && document.customId) {
		return `https://docs.google.com/presentation/d/${document.customId}`;
	}
	// Fallback to existing URL for all other document types
	return document.url;
};