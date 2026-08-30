export function csvEscape(value: string | null | undefined): string {
	if (value == null) return ""
	const spreadsheetSafeValue = /^[=+\-@]/.test(value) ? `'${value}` : value
	const needsQuoting = /[",\n\r]/.test(spreadsheetSafeValue)
	const escaped = spreadsheetSafeValue.replace(/"/g, '""')
	return needsQuoting ? `"${escaped}"` : escaped
}
