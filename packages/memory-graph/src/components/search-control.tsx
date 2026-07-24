import { memo } from "react"
import type { GraphThemeColors } from "../types"

interface SearchControlProps {
	query: string
	onQueryChange: (query: string) => void
	/** Number of nodes matching the current query. */
	matchCount: number
	/** Zero-based index of the focused match, or -1 when there is none. */
	currentIndex: number
	onNext: () => void
	onPrev: () => void
	onClear: () => void
	colors: GraphThemeColors
	compact?: boolean
	placeholder?: string
	inputRef?: React.RefObject<HTMLInputElement | null>
}

function StepButton({
	onClick,
	disabled,
	label,
	colors,
	children,
}: {
	onClick: () => void
	disabled: boolean
	label: string
	colors: GraphThemeColors
	children: React.ReactNode
}) {
	const style: React.CSSProperties = {
		width: 20,
		height: 20,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 4,
		backgroundColor: colors.controlBg,
		border: `1px solid ${colors.controlBorder}`,
		color: colors.textSecondary,
		cursor: disabled ? "default" : "pointer",
		fontSize: 12,
		padding: 0,
		opacity: disabled ? 0.4 : 1,
		transition: "opacity 0.15s",
	}

	return (
		<button
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			style={style}
			type="button"
			onMouseEnter={(e) => {
				if (!disabled) e.currentTarget.style.opacity = "0.8"
			}}
			onMouseLeave={(e) => {
				if (!disabled) e.currentTarget.style.opacity = "1"
			}}
		>
			{children}
		</button>
	)
}

export const SearchControl = memo<SearchControlProps>(
	({
		query,
		onQueryChange,
		matchCount,
		currentIndex,
		onNext,
		onPrev,
		onClear,
		colors,
		compact = false,
		placeholder = "Search nodes",
		inputRef,
	}) => {
		const hasQuery = query.trim().length > 0
		const rowStyle: React.CSSProperties = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			width: "fit-content",
			maxWidth: compact ? "calc(100vw - 32px)" : 260,
			paddingLeft: 12,
			paddingRight: 8,
			paddingTop: 6,
			paddingBottom: 6,
			borderRadius: 9999,
			backgroundColor: colors.controlBg,
			border: `1px solid ${colors.controlBorder}`,
			boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
		}

		const inputStyle: React.CSSProperties = {
			flex: 1,
			minWidth: 0,
			width: compact ? 120 : 150,
			background: "transparent",
			border: "none",
			outline: "none",
			color: colors.textPrimary,
			fontSize: 12,
			padding: 0,
		}

		const countStyle: React.CSSProperties = {
			fontSize: 11,
			fontWeight: 500,
			color:
				hasQuery && matchCount === 0 ? colors.textMuted : colors.textSecondary,
			whiteSpace: "nowrap",
			minWidth: 34,
			textAlign: "right",
		}

		const countLabel = !hasQuery
			? ""
			: matchCount === 0
				? "0/0"
				: `${currentIndex + 1}/${matchCount}`

		return (
			<div style={rowStyle}>
				<input
					aria-label="Search graph nodes"
					onChange={(e) => onQueryChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault()
							if (e.shiftKey) onPrev()
							else onNext()
						} else if (e.key === "Escape") {
							e.preventDefault()
							onClear()
						}
					}}
					placeholder={placeholder}
					ref={inputRef}
					style={inputStyle}
					type="text"
					value={query}
				/>

				{hasQuery && <span style={countStyle}>{countLabel}</span>}

				<div style={{ display: "flex", alignItems: "center", gap: 2 }}>
					<StepButton
						colors={colors}
						disabled={matchCount === 0}
						label="Previous match"
						onClick={onPrev}
					>
						<span style={{ fontSize: 11 }}>↑</span>
					</StepButton>
					<StepButton
						colors={colors}
						disabled={matchCount === 0}
						label="Next match"
						onClick={onNext}
					>
						<span style={{ fontSize: 11 }}>↓</span>
					</StepButton>
					<StepButton
						colors={colors}
						disabled={!hasQuery}
						label="Clear search"
						onClick={onClear}
					>
						<span style={{ fontSize: 12 }}>×</span>
					</StepButton>
				</div>
			</div>
		)
	},
)

SearchControl.displayName = "SearchControl"
