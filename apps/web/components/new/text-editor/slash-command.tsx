"use client"

import { Extension, type Editor, type Range } from "@tiptap/core"
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion"
import { useEffect, useLayoutEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import {
	useFloating,
	offset,
	flip,
	shift,
	autoUpdate,
} from "@floating-ui/react"
import { cn } from "@lib/utils"

export interface SuggestionItem {
	title: string
	description: string
	searchTerms?: string[]
	icon: React.ReactNode
	command: (props: { editor: Editor; range: Range }) => void
}

interface CommandListProps {
	items: SuggestionItem[]
	command: (item: SuggestionItem) => void
	selectedIndex: number
}

function CommandList({ items, command, selectedIndex }: CommandListProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const selectedElement = containerRef.current?.querySelector(
			`[data-index="${selectedIndex}"]`,
		)
		selectedElement?.scrollIntoView({ block: "nearest" })
	}, [selectedIndex])

	if (items.length === 0) {
		return (
			<div className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-[8px] bg-[#1b1f24] p-2 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.25),inset_1px_1px_1px_0px_rgba(255,255,255,0.1)]">
				<div className="px-2 text-muted-foreground">No results</div>
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-[8px] bg-[#1b1f24] p-2 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.25),inset_1px_1px_1px_0px_rgba(255,255,255,0.1)]"
		>
			{items.map((item, index) => (
				<button
					type="button"
					key={item.title}
					data-index={index}
					onClick={() => command(item)}
					className={cn(
						"flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left hover:bg-[#2e353d]",
						index === selectedIndex && "bg-[#2e353d]",
					)}
				>
					<div className="flex size-[20px] shrink-0 items-center justify-center text-[#fafafa]">
						{item.icon}
					</div>
					<p className="font-medium text-[16px] leading-[1.35] tracking-[-0.16px] text-[#fafafa]">
						{item.title}
					</p>
				</button>
			))}
		</div>
	)
}

interface CommandMenuProps {
	items: SuggestionItem[]
	command: (item: SuggestionItem) => void
	clientRect: (() => DOMRect | null) | null
	selectedIndex: number
}

function CommandMenu({
	items,
	command,
	clientRect,
	selectedIndex,
}: CommandMenuProps) {
	const [mounted, setMounted] = useState(false)

	const { refs, floatingStyles } = useFloating({
		placement: "bottom-start",
		middleware: [offset(8), flip(), shift()],
		whileElementsMounted: autoUpdate,
	})

	useLayoutEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		const rect = clientRect?.()
		if (rect) {
			refs.setReference({
				getBoundingClientRect: () => rect,
			})
		}
	}, [clientRect, refs])

	if (!mounted) return null

	return createPortal(
		<div ref={refs.setFloating} style={floatingStyles} className="z-50">
			<CommandList
				items={items}
				command={command}
				selectedIndex={selectedIndex}
			/>
		</div>,
		document.body,
	)
}

export function createSlashCommand(items: SuggestionItem[]) {
	let component: {
		updateProps: (props: CommandMenuProps) => void
		destroy: () => void
		element: HTMLElement
	} | null = null
	let root: Root | null = null
	let selectedIndex = 0
	let currentItems: SuggestionItem[] = []

	const renderMenu = (props: {
		items: SuggestionItem[]
		command: (item: SuggestionItem) => void
		clientRect: (() => DOMRect | null) | null
	}) => {
		root?.render(
			<CommandMenu
				items={props.items}
				command={props.command}
				clientRect={props.clientRect}
				selectedIndex={selectedIndex}
			/>,
		)
	}

	const suggestion: Omit<SuggestionOptions<SuggestionItem>, "editor"> = {
		char: "/",
		items: ({ query }) => {
			return items.filter(
				(item) =>
					item.title.toLowerCase().includes(query.toLowerCase()) ||
					item.searchTerms?.some((term) =>
						term.toLowerCase().includes(query.toLowerCase()),
					),
			)
		},
		command: ({ editor, range, props }) => {
			props.command({ editor, range })
		},
		render: () => {
			let currentCommand: ((item: SuggestionItem) => void) | null = null
			let currentClientRect: (() => DOMRect | null) | null = null

			return {
				onStart: (props) => {
					selectedIndex = 0
					currentItems = props.items as SuggestionItem[]
					currentCommand = props.command as (
						item: SuggestionItem,
					) => void
					currentClientRect = props.clientRect ?? null

					const element = document.createElement("div")
					document.body.appendChild(element)

					root = createRoot(element)
					if (currentCommand) {
						renderMenu({
							items: currentItems,
							command: currentCommand,
							clientRect: currentClientRect,
						})
					}

					component = {
						element,
						updateProps: (newProps: CommandMenuProps) => {
							root?.render(
								<CommandMenu
									items={newProps.items}
									command={newProps.command}
									clientRect={newProps.clientRect}
									selectedIndex={newProps.selectedIndex}
								/>,
							)
						},
						destroy: () => {
							root?.unmount()
							element.remove()
							root = null
						},
					}
				},

				onUpdate: (props) => {
					currentItems = props.items as SuggestionItem[]
					currentCommand = props.command as (
						item: SuggestionItem,
					) => void
					currentClientRect = props.clientRect ?? null

					if (selectedIndex >= currentItems.length) {
						selectedIndex = Math.max(0, currentItems.length - 1)
					}

					if (currentCommand) {
						component?.updateProps({
							items: currentItems,
							command: currentCommand,
							clientRect: currentClientRect,
							selectedIndex,
						})
					}
				},

				onKeyDown: (props) => {
					const { event } = props

					if (event.key === "Escape") {
						component?.destroy()
						component = null
						return true
					}

					if (event.key === "ArrowUp") {
						selectedIndex =
							selectedIndex <= 0
								? currentItems.length - 1
								: selectedIndex - 1
						if (currentCommand) {
							component?.updateProps({
								items: currentItems,
								command: currentCommand,
								clientRect: currentClientRect,
								selectedIndex,
							})
						}
						return true
					}

					if (event.key === "ArrowDown") {
						selectedIndex =
							selectedIndex >= currentItems.length - 1
								? 0
								: selectedIndex + 1
						if (currentCommand) {
							component?.updateProps({
								items: currentItems,
								command: currentCommand,
								clientRect: currentClientRect,
								selectedIndex,
							})
						}
						return true
					}

					if (event.key === "Enter") {
						const item = currentItems[selectedIndex]
						if (item && currentCommand) {
							currentCommand(item)
						}
						return true
					}

					return false
				},

				onExit: () => {
					component?.destroy()
					component = null
				},
			}
		},
	}

	return Extension.create({
		name: "slashCommand",

		addOptions() {
			return {
				suggestion,
			}
		},

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					...this.options.suggestion,
				}),
			]
		},
	})
}
