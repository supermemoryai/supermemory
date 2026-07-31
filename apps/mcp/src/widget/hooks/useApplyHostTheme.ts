import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps"
import {
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps"
import { useEffect } from "react"
import { useHostContext } from "./useHostContext"

function applyHostDimensions(ctx: McpUiHostContext) {
	const dimensions = ctx.containerDimensions
	const height =
		dimensions && "height" in dimensions ? dimensions.height : undefined
	const width =
		dimensions && "width" in dimensions ? dimensions.width : undefined
	if (height) {
		document.documentElement.style.setProperty("--host-height", `${height}px`)
	}
	if (width) {
		document.documentElement.style.setProperty("--host-width", `${width}px`)
	}
}

function applySafeArea(ctx: McpUiHostContext) {
	const insets = ctx.safeAreaInsets
	if (insets) {
		const { top, right, bottom, left } = insets
		document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`
	}
}

/**
 * Applies host-provided theme tokens, CSS variables, fonts, dimensions,
 * and safe-area insets to the document. Re-applies on every host context change.
 */
export function useApplyHostTheme() {
	const ctx = useHostContext()

	useEffect(() => {
		if (!ctx) return
		if (ctx.theme) applyDocumentTheme(ctx.theme)
		if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables)
		if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts)
		applyHostDimensions(ctx)
		applySafeArea(ctx)
	}, [ctx])
}
