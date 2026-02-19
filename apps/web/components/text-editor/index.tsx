"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/core"
import { Markdown } from "@tiptap/markdown"
import { useRef, useEffect, useCallback } from "react"
import { defaultExtensions } from "./extensions"
import { slashCommand } from "./suggestions"
import { Bold, Italic, Code } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { cn } from "@lib/utils"

const extensions = [...defaultExtensions, slashCommand, Markdown]

export function TextEditor({
	content: initialContent,
	onContentChange,
	onSubmit,
}: {
	content: string | undefined
	onContentChange: (content: string) => void
	onSubmit: () => void
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<Editor | null>(null)
	const onSubmitRef = useRef(onSubmit)
	const hasUserEditedRef = useRef(false)

	useEffect(() => {
		onSubmitRef.current = onSubmit
	}, [onSubmit])

	const debouncedUpdates = useDebouncedCallback((editor: Editor) => {
		if (!hasUserEditedRef.current) return
		const json = editor.getJSON()
		const markdown = editor.storage.markdown?.manager?.serialize(json) ?? ""
		onContentChange?.(markdown)
	}, 500)

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
			debouncedUpdates(editor)
		},
		editorProps: {
			handleKeyDown: (_view, event) => {
				if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
					event.preventDefault()
					debouncedUpdates.flush()
					onSubmitRef.current?.()
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
				className="w-full h-full outline-none prose prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror-focused]:outline-none text-editor-prose cursor-text"
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
