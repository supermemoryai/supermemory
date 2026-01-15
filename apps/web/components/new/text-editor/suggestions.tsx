import {
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	TextQuote,
	Text,
} from "lucide-react"
import { createSlashCommand, type SuggestionItem } from "./slash-command"

export const suggestionItems: SuggestionItem[] = [
	{
		title: "Heading 1",
		description: "Big section heading.",
		searchTerms: ["title", "big", "large"],
		icon: <Heading1 size={20} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 1 })
				.run()
		},
	},
	{
		title: "Heading 2",
		description: "Medium section heading.",
		searchTerms: ["subtitle", "medium"],
		icon: <Heading2 size={20} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 2 })
				.run()
		},
	},
	{
		title: "Heading 3",
		description: "Small section heading.",
		searchTerms: ["subtitle", "small"],
		icon: <Heading3 size={20} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 3 })
				.run()
		},
	},
	{
		title: "Text",
		description: "Just start typing with plain text.",
		searchTerms: ["p", "paragraph"],
		icon: <Text size={18} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.toggleNode("paragraph", "paragraph")
				.run()
		},
	},
	{
		title: "Bullet List",
		description: "Create a simple bullet list.",
		searchTerms: ["unordered", "point"],
		icon: <List size={20} />,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run()
		},
	},
	{
		title: "Numbered List",
		description: "Create a list with numbering.",
		searchTerms: ["ordered"],
		icon: <ListOrdered size={20} />,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run()
		},
	},
	{
		title: "Block Quote",
		description: "Capture a quote.",
		searchTerms: ["blockquote"],
		icon: <TextQuote size={20} />,
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.toggleNode("paragraph", "paragraph")
				.toggleBlockquote()
				.run(),
	},
]

export const slashCommand = createSlashCommand(suggestionItems)
