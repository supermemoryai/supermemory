"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/core"
import { Markdown } from "@tiptap/markdown"
import { useRef, useEffect, useCallback, useMemo } from "react"
import { createDefaultExtensions } from "./extensions"
import { slashCommand } from "./suggestions"
import { Bold, Italic, Code } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { cn } from "@lib/utils"

type EditorSnapshot = Pick<Editor, "getJSON" | "storage">
type SubmitShortcutEvent = Pick<
	KeyboardEvent,
	"ctrlKey" | "key" | "metaKey" | "preventDefault"
>

function getEditorMarkdown(editor: EditorSnapshot): string {
	const json = editor.getJSON()
	return editor.storage.markdown?.manager?.serialize(json) ?? ""
}

export function resolveSubmittedContent(
	submittedContent: string | undefined,
	fallbackContent: string,
): string {
	return submittedContent ?? fallbackContent
}

export function submitEditorContent(
	editor: EditorSnapshot | null,
	flushPendingUpdate: () => void,
	onSubmit: (content: string) => void,
): void {
	if (!editor) return

	// Parent state updates flushed below are not visible to this event's submit closure.
	const markdown = getEditorMarkdown(editor)
	flushPendingUpdate()
	onSubmit(markdown)
}

export function handleEditorSubmitShortcut(
	event: SubmitShortcutEvent,
	editor: EditorSnapshot | null,
	flushPendingUpdate: () => void,
	onSubmit: (content: string) => void,
): boolean {
	if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return false

	event.preventDefault()
	submitEditorContent(editor, flushPendingUpdate, onSubmit)
	return true
}

export function TextEditor({
	content: initialContent,
	onContentChange,
	onSubmit,
	debounceMs = 500,
	autoFocus = false,
	placeholder,
}: {
	content: string | undefined
	onContentChange: (content: string) => void
	onSubmit: (content: string) => void
	debounceMs?: number
	autoFocus?: boolean
	placeholder?: string
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<Editor | null>(null)
	const onSubmitRef = useRef(onSubmit)
	const hasUserEditedRef = useRef(false)
	const extensions = useMemo(
		() => [...createDefaultExtensions(placeholder), slashCommand, Markdown],
		[placeholder],
	)

	useEffect(() => {
		onSubmitRef.current = onSubmit
	}, [onSubmit])

	const debouncedUpdates = useDebouncedCallback((editor: Editor) => {
		if (!hasUserEditedRef.current) return
		const markdown = getEditorMarkdown(editor)
		onContentChange?.(markdown)
	}, debounceMs)

	const editor = useEditor({
		extensions,
		content: initialContent,
		contentType: "markdown",
		immediatelyRender: true,
		onCreate: ({ editor }) => {
			editorRef.current = editor
		},
		onUpdate: ({ editor }) => {
			editorRef.current = editor
			if (!hasUserEditedRef.current) return
			if (debounceMs === 0) {
				const markdown = getEditorMarkdown(editor)
				onContentChange?.(markdown)
				return
			}
			debouncedUpdates(editor)
		},
		editorProps: {
			handleKeyDown: (_view, event) => {
				if (
					handleEditorSubmitShortcut(
						event,
						editorRef.current,
						() => debouncedUpdates.flush(),
						onSubmitRef.current,
					)
				) {
					return true
				}
				hasUserEditedRef.current = true
				return false
			},
			handleTextInput: () => {
				hasUserEditedRef.current = true
				return false
			},
			handlePaste: () => {
				hasUserEditedRef.current = true
				return false
			},
			handleDrop: () => {
				hasUserEditedRef.current = true
				return false
			},
		},
	})

	useEffect(() => {
		if (editor && initialContent) {
			hasUserEditedRef.current = false
			editor.commands.setContent(initialContent, { contentType: "markdown" })
		}
	}, [editor, initialContent])

	useEffect(() => {
		if (!editor || !autoFocus) return

		const id = window.setTimeout(() => {
			editor.commands.focus("end")
		}, 0)

		return () => window.clearTimeout(id)
	}, [editor, autoFocus])

	const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement
		if (target.closest(".ProseMirror")) {
			return
		}
		if (target.closest("button, a")) {
			return
		}

		const proseMirror = containerRef.current?.querySelector(
			".ProseMirror",
		) as HTMLElement
		if (proseMirror && editorRef.current) {
			setTimeout(() => {
				proseMirror.focus()
				editorRef.current?.commands.focus("end")
			}, 0)
		}
	}, [])

	useEffect(() => {
		return () => {
			// Flush any pending debounced updates before destroying editor
			debouncedUpdates.flush()
			editor?.destroy()
		}
	}, [editor, debouncedUpdates])

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: div is needed as container for editor, cannot use button */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: we need to use a div to get the focus on the editor */}
			<div
				role="button"
				tabIndex={0}
				ref={containerRef}
				onClick={handleClick}
				className="size-full cursor-text outline-none prose prose-invert max-w-none text-editor-prose [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-6 [&_.ProseMirror]:text-[#D7DEE8] [&_.ProseMirror-focused]:outline-none [&_.ProseMirror]:focus:outline-none"
			>
				<EditorContent editor={editor} />
			</div>
			{editor && (
				<BubbleMenu
					editor={editor}
					options={{ placement: "bottom-start", offset: 8 }}
				>
					<div className="flex items-center gap-1 rounded-[8px] bg-[#1b1f24] p-2 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.25),inset_1px_1px_1px_0px_rgba(255,255,255,0.1)]">
						<button
							type="button"
							onClick={() => editor.chain().focus().toggleBold().run()}
							className={cn(
								"flex items-center justify-center rounded-[4px] p-1.5 hover:bg-[#2e353d] cursor-pointer text-[#fafafa]",
								editor.isActive("bold") && "bg-[#2e353d]",
							)}
						>
							<Bold size={16} />
						</button>
						<button
							type="button"
							onClick={() => editor.chain().focus().toggleItalic().run()}
							className={cn(
								"flex items-center justify-center rounded-[4px] p-1.5 hover:bg-[#2e353d] cursor-pointer text-[#fafafa]",
								editor.isActive("italic") && "bg-[#2e353d]",
							)}
						>
							<Italic size={16} />
						</button>
						<button
							type="button"
							onClick={() => editor.chain().focus().toggleCode().run()}
							className={cn(
								"flex items-center justify-center rounded-[4px] p-1.5 hover:bg-[#2e353d] cursor-pointer text-[#fafafa]",
								editor.isActive("code") && "bg-[#2e353d]",
							)}
						>
							<Code size={16} />
						</button>
					</div>
				</BubbleMenu>
			)}
		</>
	)
}
