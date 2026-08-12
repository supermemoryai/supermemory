import { memo } from "react"
import { DEFAULT_LABELS } from "../constants"
import type {
	GraphThemeColors,
	LoadingIndicatorProps,
	ResolvedMemoryGraphLabels,
} from "../types"

const spinKeyframes = `
@keyframes mg-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`

let styleInjected = false
function injectSpinStyle() {
	if (styleInjected || typeof document === "undefined") return
	const style = document.createElement("style")
	style.textContent = spinKeyframes
	document.head.appendChild(style)
	styleInjected = true
}

export const LoadingIndicator = memo<
	LoadingIndicatorProps & {
		colors?: GraphThemeColors
		labels?: ResolvedMemoryGraphLabels
	}
>(
	({
		isLoading,
		isLoadingMore,
		totalLoaded,
		colors,
		labels = DEFAULT_LABELS,
	}) => {
		if (!isLoading && !isLoadingMore) return null

		injectSpinStyle()

		const containerStyle: React.CSSProperties = {
			position: "absolute",
			zIndex: 30,
			overflow: "hidden",
			top: 16,
			left: 16,
			borderRadius: 12,
			border: `1px solid ${colors?.controlBorder ?? "#2A2F36"}`,
			backgroundColor: colors?.controlBg ?? "#1a1f29",
			paddingLeft: 16,
			paddingRight: 16,
			paddingTop: 12,
			paddingBottom: 12,
			boxShadow:
				"0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
		}

		const flexStyle: React.CSSProperties = {
			display: "flex",
			alignItems: "center",
			gap: 8,
		}

		const spinnerStyle: React.CSSProperties = {
			width: 16,
			height: 16,
			animation: "mg-spin 1s linear infinite",
			color: colors?.accent ?? "#3B73B8",
			flexShrink: 0,
		}

		const textStyle: React.CSSProperties = {
			fontSize: 14,
			color: colors?.textSecondary ?? "#e2e8f0",
		}

		return (
			<div style={containerStyle}>
				<div style={flexStyle}>
					<svg
						aria-hidden="true"
						fill="none"
						role="img"
						stroke="currentColor"
						strokeWidth="2"
						viewBox="0 0 24 24"
						style={spinnerStyle}
					>
						<title>Loading</title>
						<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
					</svg>
					<span style={textStyle}>
						{isLoading
							? "Loading memory graph..."
							: labels.loadingMoreDocuments(totalLoaded)}
					</span>
				</div>
			</div>
		)
	},
)

LoadingIndicator.displayName = "LoadingIndicator"
