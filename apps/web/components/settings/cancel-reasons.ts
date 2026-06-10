export const CANCEL_REASONS = [
	{ value: "too_expensive", label: "Too expensive" },
	{ value: "missing_features", label: "Missing features I need" },
	{ value: "switching", label: "Found a better alternative" },
	{ value: "not_using", label: "Not using it enough" },
	{ value: "other", label: "Other" },
] as const

export type CancelReasonValue = (typeof CANCEL_REASONS)[number]["value"]

const NEEDS_DETAIL: CancelReasonValue[] = [
	"missing_features",
	"switching",
	"other",
]

export function cancelReasonNeedsDetail(value: CancelReasonValue): boolean {
	return NEEDS_DETAIL.includes(value)
}
