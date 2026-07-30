import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps"
import {
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps"
import { useEffect } from "react"
import { useHostContext } from "./useHostContext"

function applyHostDimensions(ctx: McpUiHostContext) {
	const dims = (
		ctx as McpUiHostContext & {
			containerDimensions?: { height?: number; width?: number }
		}
	).containerDimensions
	if (dims?.height) {
		document.documentElement.style.setProperty(
			"--host-height",
			`${dims.height}px`,
		)
	}
	if (dims?.width) {
		document.documentElement.style.setProperty(
			"--host-width",
			`${dims.width}px`,
		)
	}
}

function applySafeArea(ctx: McpUiHostContext) {
	const insets = (
		ctx as McpUiHostContext & {
			safeAreaInsets?: {
				top: number
				right: number
				bottom: number
				left: number
			}
		}
	).safeAreaInsets
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
