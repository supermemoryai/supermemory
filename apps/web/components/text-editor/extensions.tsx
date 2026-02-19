import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { cx } from "class-variance-authority"

const placeholder = Placeholder.configure({
	placeholder: 'Write, paste anything or type "/" for commands...',
})

const taskList = TaskList.configure({
	HTMLAttributes: {
		class: cx("not-prose pl-2"),
	},
})

const taskItem = TaskItem.configure({
	HTMLAttributes: {
		class: cx("flex items-start my-4"),
	},
	nested: true,
})

const link = Link.configure({
	HTMLAttributes: {
		class: cx(
			"text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer",
		),
	},
	openOnClick: false,
})

const image = Image.configure({
	HTMLAttributes: {
		class: cx("rounded-lg border border-muted"),
	},
})

const starterKit = StarterKit.configure({
	bulletList: {
		HTMLAttributes: {
			class: cx("list-disc list-outside leading-3 -mt-2"),
		},
	},
	orderedList: {
		HTMLAttributes: {
			class: cx("list-decimal list-outside leading-3 -mt-2"),
		},
	},
	listItem: {
		HTMLAttributes: {
			class: cx("leading-normal -mb-2"),
		},
	},
	blockquote: {
		HTMLAttributes: {
			class: cx("border-l-4 border-primary"),
		},
	},
	codeBlock: {
		HTMLAttributes: {
			class: cx("rounded-sm bg-muted border p-5 font-mono font-medium"),
		},
	},
	code: {
		HTMLAttributes: {
			class: cx("rounded-md bg-muted  px-1.5 py-1 font-mono font-medium"),
			spellcheck: "false",
		},
	},
	horizontalRule: {
		HTMLAttributes: {
			class: cx("mt-4 mb-6 border-t border-muted-foreground"),
		},
	},
	dropcursor: {
		color: "#DBEAFE",
		width: 4,
	},
	gapcursor: false,
})

export const defaultExtensions = [
	starterKit,
	placeholder,
	link,
	image,
	taskList,
	taskItem,
]
