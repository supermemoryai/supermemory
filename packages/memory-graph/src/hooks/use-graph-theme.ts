import { useEffect, useMemo, useState } from "react"
import type { GraphThemeColors } from "../types"
import { DEFAULT_COLORS } from "../constants"

function readCssVar(name: string, fallback: string): string {
	if (typeof document === "undefined") return fallback
	const val = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim()
	return val || fallback
}

function readCssColorList(name: string, fallback: string[]): string[] {
	if (typeof document === "undefined") return fallback
	const val = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim()
	if (!val) return fallback
	const colors = val
		.split(",")
		.map((color) => color.trim())
		.filter(Boolean)
	return colors.length > 0 ? colors : fallback
}

function resolveColors(): GraphThemeColors {
	return {
		bg: readCssVar("--graph-bg", DEFAULT_COLORS.bg),
		docFill: readCssVar("--graph-doc-fill", DEFAULT_COLORS.docFill),
		docStroke: readCssVar("--graph-doc-stroke", DEFAULT_COLORS.docStroke),
		docInnerFill: readCssVar("--graph-doc-inner", DEFAULT_COLORS.docInnerFill),
		memFill: readCssVar("--graph-mem-fill", DEFAULT_COLORS.memFill),
		memFillHover: readCssVar(
			"--graph-mem-fill-hover",
			DEFAULT_COLORS.memFillHover,
		),
		memStrokeDefault: readCssVar(
			"--graph-mem-stroke",
			DEFAULT_COLORS.memStrokeDefault,
		),
		accent: readCssVar("--graph-accent", DEFAULT_COLORS.accent),
		textPrimary: readCssVar("--graph-text-primary", DEFAULT_COLORS.textPrimary),
		textSecondary: readCssVar(
			"--graph-text-secondary",
			DEFAULT_COLORS.textSecondary,
		),
		textMuted: readCssVar("--graph-text-muted", DEFAULT_COLORS.textMuted),
		edgeDerives: readCssVar("--graph-edge-derives", DEFAULT_COLORS.edgeDerives),
		edgeUpdates: readCssVar("--graph-edge-updates", DEFAULT_COLORS.edgeUpdates),
		edgeExtends: readCssVar("--graph-edge-extends", DEFAULT_COLORS.edgeExtends),
		memBorderForgotten: readCssVar(
			"--graph-mem-border-forgotten",
			DEFAULT_COLORS.memBorderForgotten,
		),
		memBorderExpiring: readCssVar(
			"--graph-mem-border-expiring",
			DEFAULT_COLORS.memBorderExpiring,
		),
		memBorderRecent: readCssVar(
			"--graph-mem-border-recent",
			DEFAULT_COLORS.memBorderRecent,
		),
		glowColor: readCssVar("--graph-glow", DEFAULT_COLORS.glowColor),
		iconColor: readCssVar("--graph-icon", DEFAULT_COLORS.iconColor),
		popoverBg: readCssVar("--graph-popover-bg", DEFAULT_COLORS.popoverBg),
		popoverBorder: readCssVar(
			"--graph-popover-border",
			DEFAULT_COLORS.popoverBorder,
		),
		popoverTextPrimary: readCssVar(
			"--graph-popover-text-primary",
			DEFAULT_COLORS.popoverTextPrimary,
		),
		popoverTextSecondary: readCssVar(
			"--graph-popover-text-secondary",
			DEFAULT_COLORS.popoverTextSecondary,
		),
		popoverTextMuted: readCssVar(
			"--graph-popover-text-muted",
			DEFAULT_COLORS.popoverTextMuted,
		),
		controlBg: readCssVar("--graph-control-bg", DEFAULT_COLORS.controlBg),
		controlBorder: readCssVar(
			"--graph-control-border",
			DEFAULT_COLORS.controlBorder,
		),
		clusterColors: readCssColorList(
			"--graph-cluster-colors",
			DEFAULT_COLORS.clusterColors,
		),
	}
}

export function useGraphTheme(
	overrides?: Partial<GraphThemeColors>,
): GraphThemeColors {
	const [colors, setColors] = useState<GraphThemeColors>(() => resolveColors())

	useEffect(() => {
		const update = () => setColors(resolveColors())

		// Re-read on theme class change
		const observer = new MutationObserver((mutations) => {
			for (const m of mutations) {
				if (m.type === "attributes" && m.attributeName === "class") {
					update()
				}
			}
		})
		observer.observe(document.documentElement, { attributes: true })

		// Also listen for media query changes (system theme)
		const mq = window.matchMedia("(prefers-color-scheme: dark)")
		mq.addEventListener("change", update)

		return () => {
			observer.disconnect()
			mq.removeEventListener("change", update)
		}
	}, [])

	// Serialize overrides to a stable string key so useMemo only recomputes
	// when the actual override values change, not on every render.
	const overrideKey = overrides
		? Object.entries(overrides)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => `${k}:${Array.isArray(v) ? v.join("|") : v}`)
				.join(",")
		: ""

	// biome-ignore lint/correctness/useExhaustiveDependencies: overrideKey tracks overrides by value
	const merged = useMemo(
		() => (overrides ? { ...colors, ...overrides } : colors),
		[colors, overrideKey],
	)

	return merged
}
