import {
	DEFAULT_COLORS,
	type GraphApiDocument,
	type GraphApiMemory,
	type GraphThemeColors,
	MemoryGraph,
	type MemoryRelation,
} from "@supermemory/memory-graph"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
	DocumentMemoryEntry,
	DocumentWithMemories,
} from "../../shared/types"
import { cn } from "../design/lib/cn"
import { useApp } from "../hooks/useApp"
import { useHostContext } from "../hooks/useHostContext"
import { useLog } from "../hooks/useLog"
import { ArrowsIn, ArrowsOut } from "../lib/icons"

// GraphThemeColors key → the --graph-* CSS variable it resolves from. Same
// mapping as the package's internal useGraphTheme, but we drive it ourselves
// so we can re-read at a reliable time (see useGraphColors).
const GRAPH_VARS: Record<keyof GraphThemeColors, string> = {
	bg: "--graph-bg",
	docFill: "--graph-doc-fill",
	docStroke: "--graph-doc-stroke",
	docInnerFill: "--graph-doc-inner",
	memFill: "--graph-mem-fill",
	memFillHover: "--graph-mem-fill-hover",
	memStrokeDefault: "--graph-mem-stroke",
	accent: "--graph-accent",
	textPrimary: "--graph-text-primary",
	textSecondary: "--graph-text-secondary",
	textMuted: "--graph-text-muted",
	edgeDerives: "--graph-edge-derives",
	edgeUpdates: "--graph-edge-updates",
	edgeExtends: "--graph-edge-extends",
	memBorderForgotten: "--graph-mem-border-forgotten",
	memBorderExpiring: "--graph-mem-border-expiring",
	memBorderRecent: "--graph-mem-border-recent",
	glowColor: "--graph-glow",
	iconColor: "--graph-icon",
	popoverBg: "--graph-popover-bg",
	popoverBorder: "--graph-popover-border",
	popoverTextPrimary: "--graph-popover-text-primary",
	popoverTextSecondary: "--graph-popover-text-secondary",
	popoverTextMuted: "--graph-popover-text-muted",
	controlBg: "--graph-control-bg",
	controlBorder: "--graph-control-border",
}

function readGraphColors(): GraphThemeColors {
	const s = getComputedStyle(document.documentElement)
	const out = {} as GraphThemeColors
	for (const key of Object.keys(GRAPH_VARS) as (keyof GraphThemeColors)[]) {
		out[key] = s.getPropertyValue(GRAPH_VARS[key]).trim() || DEFAULT_COLORS[key]
	}
	return out
}

// Read the graph palette from CSS, and re-read after a theme switch. We can't
// rely on the package's own useGraphTheme: it watches the `class` attribute,
// but the MCP host themes via `data-theme`, applied in a passive effect that
// runs AFTER children render. requestAnimationFrame fires after that effect,
// so by then `data-theme` (hence the --graph-* values) is current.
function useGraphColors(theme: string): GraphThemeColors {
	const [colors, setColors] = useState<GraphThemeColors>(readGraphColors)
	useEffect(() => {
		// `theme` change is the trigger; re-read after the host applies
		// data-theme (rAF fires after that passive effect).
		if (!theme) return
		const id = requestAnimationFrame(() => setColors(readGraphColors()))
		return () => cancelAnimationFrame(id)
	}, [theme])
	return colors
}

interface Props {
	documents: DocumentWithMemories[]
	totalCount: number
	containerTag?: string
}

type DisplayMode = "inline" | "fullscreen" | "pip"

// Map the widget's API shape (DocumentWithMemories) into the package's
// GraphApiDocument shape. Mirrors console-v2's use-graph-api transform so the
// graph renders identically to the console.
function toGraphMemory(mem: DocumentMemoryEntry): GraphApiMemory {
	return {
		id: mem.id,
		memory: mem.memory ?? "",
		isStatic: mem.isStatic ?? false,
		spaceId: mem.spaceId ?? "",
		isLatest: mem.isLatest ?? true,
		isForgotten: mem.isForgotten ?? false,
		forgetAfter: mem.forgetAfter ?? null,
		forgetReason: mem.forgetReason ?? null,
		version: mem.version ?? 1,
		parentMemoryId: mem.parentMemoryId ?? null,
		rootMemoryId: mem.rootMemoryId ?? null,
		createdAt: mem.createdAt,
		updatedAt: mem.updatedAt,
		relation: null,
		updatesMemoryId: null,
		nextVersionId: null,
		memoryRelations:
			(mem.memoryRelations as Record<string, MemoryRelation> | undefined) ??
			null,
		spaceContainerTag: null,
	}
}

function toGraphDocument(doc: DocumentWithMemories): GraphApiDocument {
	return {
		id: doc.id,
		title: doc.title,
		summary: doc.summary ?? null,
		documentType: doc.type,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		memories: doc.memoryEntries.map(toGraphMemory),
	}
}

export function Graph({ documents, totalCount }: Props) {
	const { requestDisplayMode } = useApp()
	const ctx = useHostContext()
	const log = useLog()

	const graphDocuments = useMemo(
		() => documents.map(toGraphDocument),
		[documents],
	)

	// Track display mode locally. The host doesn't reliably echo displayMode
	// back via context, so an optimistic local toggle is the source of truth;
	// we only adopt the host's value when it actually CHANGES (host-initiated
	// exit, e.g. ESC at the host level). Without this the button is one-way.
	const ctxMode = ctx?.displayMode as DisplayMode | undefined
	const [mode, setMode] = useState<DisplayMode>(ctxMode ?? "inline")
	const prevCtxMode = useRef(ctxMode)
	useEffect(() => {
		if (ctxMode !== prevCtxMode.current) {
			prevCtxMode.current = ctxMode
			if (ctxMode) setMode(ctxMode)
		}
	}, [ctxMode])

	// Host theme (light/dark). Drives the graph palette reactively so a
	// mid-session theme switch re-themes the canvas.
	const theme = (ctx?.theme as string | undefined) ?? "light"
	const colors = useGraphColors(theme)

	const fullscreenSupported = useMemo(() => {
		const modes = (
			ctx as { availableDisplayModes?: string[] } | null | undefined
		)?.availableDisplayModes
		return Array.isArray(modes) ? modes.includes("fullscreen") : true
	}, [ctx])

	const toggleFullscreen = useCallback(async () => {
		const next = mode === "fullscreen" ? "inline" : "fullscreen"
		log("info", `[graph] fullscreen toggle: ${mode} → ${next}`)
		setMode(next) // optimistic — button + container update immediately
		try {
			const result = await requestDisplayMode(next)
			log("info", `[graph] requestDisplayMode result: ${result?.mode ?? "?"}`)
		} catch (err) {
			log("error", `[graph] requestDisplayMode failed: ${err}`)
		}
	}, [mode, requestDisplayMode, log])

	// ESC exits fullscreen — matches Excalidraw and host-page UX.
	useEffect(() => {
		if (mode !== "fullscreen") return
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault()
				void toggleFullscreen()
			}
		}
		document.addEventListener("keydown", handler)
		return () => document.removeEventListener("keydown", handler)
	}, [mode, toggleFullscreen])

	return (
		<div className="relative px-(--page-header-px) pb-(--space-6) pt-(--space-4)">
			<div
				className={cn(
					"graph-view overflow-hidden rounded-lg border border-border shadow-lg",
					mode === "fullscreen" && "fullscreen rounded-none border-0",
				)}
			>
				{/* No remount on toggle. The CSS just resizes the container; the
				    package's ResizeObserver re-lays-out and its node cache keeps
				    positions stable, so expand/minimize is instant with no reload.
				    Theme is fed reactively via the colors prop. */}
				<MemoryGraph
					colors={colors}
					documents={graphDocuments}
					totalCount={totalCount}
					variant="console"
				/>
			</div>
			{fullscreenSupported ? (
				<button
					aria-label={
						mode === "fullscreen" ? "Exit fullscreen" : "Enter fullscreen"
					}
					className="absolute top-4 right-4 z-40 inline-flex items-center justify-center w-9 h-9 rounded-md bg-bg-elevated/80 backdrop-blur border border-border text-text-secondary hover:text-text-primary hover:bg-bg-muted transition-colors"
					onClick={toggleFullscreen}
					title={mode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
					type="button"
				>
					{mode === "fullscreen" ? (
						<ArrowsIn className="size-4" />
					) : (
						<ArrowsOut className="size-4" />
					)}
				</button>
			) : null}
		</div>
	)
}
