"use client";

import { cn } from "@lib/utils";
import { Button } from "@repo/ui/components/button";
import isHotkey from "is-hotkey";
import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	Quote,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	type BaseEditor,
	createEditor,
	type Descendant,
	Editor,
	Transforms,
} from "slate";
import type { ReactEditor as ReactEditorType } from "slate-react";
import {
	Editable,
	ReactEditor,
	type RenderElementProps,
	type RenderLeafProps,
	Slate,
	withReact,
} from "slate-react";

type CustomEditor = BaseEditor & ReactEditorType;

type ParagraphElement = {
	type: "paragraph";
	children: CustomText[];
};

type HeadingElement = {
	type: "heading";
	level: number;
	children: CustomText[];
};

type ListItemElement = {
	type: "list-item";
	children: CustomText[];
};

type BlockQuoteElement = {
	type: "block-quote";
	children: CustomText[];
};

type CustomElement =
	| ParagraphElement
	| HeadingElement
	| ListItemElement
	| BlockQuoteElement;

type FormattedText = {
	text: string;
	bold?: true;
	italic?: true;
	code?: true;
};

type CustomText = FormattedText;

declare module "slate" {
	interface CustomTypes {
		Editor: CustomEditor;
		Element: CustomElement;
		Text: CustomText;
	}
}

// Hotkey mappings
const HOTKEYS: Record<string, keyof CustomText> = {
	"mod+b": "bold",
	"mod+i": "italic",
	"mod+`": "code",
};

interface TextEditorProps {
	value?: string;
	onChange?: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	containerClassName?: string;
}

const initialValue: Descendant[] = [
	{
		type: "paragraph",
		children: [{ text: "" }],
	},
];

const serialize = (nodes: Descendant[]): string => {
	return nodes.map((n) => serializeNode(n)).join("\n");
};

const serializeNode = (node: CustomElement | CustomText): string => {
	if ("text" in node) {
		let text = node.text;
		if (node.bold) text = `**${text}**`;
		if (node.italic) text = `*${text}*`;
		if (node.code) text = `\`${text}\``;
		return text;
	}

	const children = node.children
		? node.children.map(serializeNode).join("")
		: "";

	switch (node.type) {
		case "paragraph":
			return children;
		case "heading":
			return `${"#".repeat(node.level || 1)} ${children}`;
		case "list-item":
			return `- ${children}`;
		case "block-quote":
			return `> ${children}`;
		default:
			return children;
	}
};

const deserialize = (text: string): Descendant[] => {
	if (!text.trim()) {
		return initialValue;
	}

	const lines = text.split("\n");
	const nodes: Descendant[] = [];

	for (const line of lines) {
		const trimmedLine = line.trim();

		if (trimmedLine.startsWith("# ")) {
			nodes.push({
				type: "heading",
				level: 1,
				children: [{ text: trimmedLine.slice(2) }],
			});
		} else if (trimmedLine.startsWith("## ")) {
			nodes.push({
				type: "heading",
				level: 2,
				children: [{ text: trimmedLine.slice(3) }],
			});
		} else if (trimmedLine.startsWith("### ")) {
			nodes.push({
				type: "heading",
				level: 3,
				children: [{ text: trimmedLine.slice(4) }],
			});
		} else if (trimmedLine.startsWith("- ")) {
			nodes.push({
				type: "list-item",
				children: [{ text: trimmedLine.slice(2) }],
			});
		} else if (trimmedLine.startsWith("> ")) {
			nodes.push({
				type: "block-quote",
				children: [{ text: trimmedLine.slice(2) }],
			});
		} else {
			nodes.push({
				type: "paragraph",
				children: [{ text: line }],
			});
		}
	}

	return nodes.length > 0 ? nodes : initialValue;
};

const isMarkActive = (editor: CustomEditor, format: keyof CustomText) => {
	const marks = Editor.marks(editor);
	return marks ? marks[format as keyof typeof marks] === true : false;
};

const toggleMark = (editor: CustomEditor, format: keyof CustomText) => {
	const isActive = isMarkActive(editor, format);

	if (isActive) {
		Editor.removeMark(editor, format);
	} else {
		Editor.addMark(editor, format, true);
	}

	// Focus back to editor after toggling
	ReactEditor.focus(editor);
};

const isBlockActive = (
	editor: CustomEditor,
	format: string,
	level?: number,
) => {
	const { selection } = editor;
	if (!selection) return false;

	const [match] = Array.from(
		Editor.nodes(editor, {
			at: Editor.unhangRange(editor, selection),
			match: (n) =>
				!Editor.isEditor(n) &&
				(n as CustomElement).type === format &&
				(level === undefined || (n as HeadingElement).level === level),
		}),
	);

	return !!match;
};

const toggleBlock = (editor: CustomEditor, format: string, level?: number) => {
	const isActive = isBlockActive(editor, format, level);
	const newProperties: any = {
		type: isActive ? "paragraph" : format,
	};

	if (format === "heading" && level && !isActive) {
		newProperties.level = level;
	}

	Transforms.setNodes(editor, newProperties);

	// Focus back to editor after toggling
	ReactEditor.focus(editor);
};

export function TextEditor({
	value = "",
	onChange,
	onBlur,
	placeholder = "Start writing...",
	disabled = false,
	className,
	containerClassName,
}: TextEditorProps) {
	const editor = useMemo(() => withReact(createEditor()) as CustomEditor, []);
	const [editorValue, setEditorValue] = useState<Descendant[]>(() =>
		deserialize(value),
	);
	const [selection, setSelection] = useState(editor.selection);

	const renderElement = useCallback((props: RenderElementProps) => {
		switch (props.element.type) {
			case "heading": {
				const element = props.element as HeadingElement;
				const HeadingTag = `h${element.level || 1}` as
					| "h1"
					| "h2"
					| "h3"
					| "h4"
					| "h5"
					| "h6";
				return (
					<HeadingTag
						{...props.attributes}
						className={cn(
							"font-bold",
							element.level === 1 && "text-2xl mb-4",
							element.level === 2 && "text-xl mb-3",
							element.level === 3 && "text-lg mb-2",
						)}
					>
						{props.children}
					</HeadingTag>
				);
			}
			case "list-item":
				return (
					<li {...props.attributes} className="ml-4 list-disc">
						{props.children}
					</li>
				);
			case "block-quote":
				return (
					<blockquote
						{...props.attributes}
						className="border-l-4 border-foreground/20 pl-4 italic text-foreground/80"
					>
						{props.children}
					</blockquote>
				);
			default:
				return (
					<p {...props.attributes} className="mb-2">
						{props.children}
					</p>
				);
		}
	}, []);

	const renderLeaf = useCallback((props: RenderLeafProps) => {
		let { attributes, children, leaf } = props;

		if (leaf.bold) {
			children = <strong>{children}</strong>;
		}

		if (leaf.italic) {
			children = <em>{children}</em>;
		}

		if (leaf.code) {
			children = (
				<code className="bg-foreground/10 px-1 rounded text-sm">{children}</code>
			);
		}

		return <span {...attributes}>{children}</span>;
	}, []);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			// Handle hotkeys for formatting
			for (const hotkey in HOTKEYS) {
				if (isHotkey(hotkey, event)) {
					event.preventDefault();
					const mark = HOTKEYS[hotkey];
					if (mark) {
						toggleMark(editor, mark);
					}
					return;
				}
			}

			// Handle block formatting hotkeys
			if (isHotkey("mod+shift+1", event)) {
				event.preventDefault();
				toggleBlock(editor, "heading", 1);
				return;
			}
			if (isHotkey("mod+shift+2", event)) {
				event.preventDefault();
				toggleBlock(editor, "heading", 2);
				return;
			}
			if (isHotkey("mod+shift+3", event)) {
				event.preventDefault();
				toggleBlock(editor, "heading", 3);
				return;
			}
			if (isHotkey("mod+shift+8", event)) {
				event.preventDefault();
				toggleBlock(editor, "list-item");
				return;
			}
			if (isHotkey("mod+shift+.", event)) {
				event.preventDefault();
				toggleBlock(editor, "block-quote");
				return;
			}
		},
		[editor],
	);

	const handleSlateChange = useCallback(
		(newValue: Descendant[]) => {
			setEditorValue(newValue);
			const serializedValue = serialize(newValue);
			onChange?.(serializedValue);
		},
		[onChange],
	);

	// Memoized active states that update when selection changes
	const activeStates = useMemo(
		() => ({
			bold: isMarkActive(editor, "bold"),
			italic: isMarkActive(editor, "italic"),
			code: isMarkActive(editor, "code"),
			heading1: isBlockActive(editor, "heading", 1),
			heading2: isBlockActive(editor, "heading", 2),
			heading3: isBlockActive(editor, "heading", 3),
			listItem: isBlockActive(editor, "list-item"),
			blockQuote: isBlockActive(editor, "block-quote"),
		}),
		[editor, selection],
	);

	const ToolbarButton = ({
		icon: Icon,
		isActive,
		onMouseDown,
		title,
	}: {
		icon: React.ComponentType<{ className?: string }>;
		isActive: boolean;
		onMouseDown: (event: React.MouseEvent) => void;
		title: string;
	}) => (
		<Button
			variant="ghost"
			size="sm"
			className={cn(
				"h-8 w-8 !p-0 text-foreground/70 transition-all duration-200 rounded-sm cursor-pointer",
				"hover:bg-foreground/15 hover:text-foreground hover:scale-105",
				"active:scale-95",
				isActive && "bg-foreground/20 text-foreground",
			)}
			onMouseDown={onMouseDown}
			title={title}
			type="button"
		>
			<Icon
				className={cn(
					"h-4 w-4 transition-transform duration-200",
					isActive && "scale-110",
				)}
			/>
		</Button>
	);

	return (
		<div className={cn("bg-foreground/5 border border-foreground/10 rounded-md", containerClassName)}>
			<div className={cn("flex flex-col", className)}>
			<div className="flex-1 min-h-48 overflow-y-auto">
				<Slate
					editor={editor}
					initialValue={editorValue}
					onValueChange={handleSlateChange}
					onSelectionChange={() => setSelection(editor.selection)}
				>
					<Editable
						renderElement={renderElement}
						renderLeaf={renderLeaf}
						placeholder={placeholder}
						renderPlaceholder={({ children, attributes }) => {
							return (
								<div {...attributes} className="mt-2">
									{children}
								</div>
							);
						}}
						onKeyDown={handleKeyDown}
						onBlur={onBlur}
						readOnly={disabled}
						className={cn(
							"outline-none w-full h-full placeholder:text-foreground/50",
							disabled && "opacity-50 cursor-not-allowed",
						)}
						style={{
							minHeight: "23rem",
							maxHeight: "23rem",
							padding: "12px",
							overflowX: "hidden",
						}}
					/>
				</Slate>
			</div>

			{/* Toolbar */}
			<div className="p-1 flex items-center gap-2 bg-foreground/5 backdrop-blur-sm rounded-b-md">
				<div className="flex items-center gap-1">
					{/* Text formatting */}
					<ToolbarButton
						icon={Bold}
						isActive={activeStates.bold}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleMark(editor, "bold");
						}}
						title="Bold (Ctrl/Cmd+B)"
					/>
					<ToolbarButton
						icon={Italic}
						isActive={activeStates.italic}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleMark(editor, "italic");
						}}
						title="Italic (Ctrl/Cmd+I)"
					/>
					<ToolbarButton
						icon={Code}
						isActive={activeStates.code}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleMark(editor, "code");
						}}
						title="Code (Ctrl/Cmd+`)"
					/>
				</div>

				<div className="w-px h-6 bg-foreground/30 mx-2" />

				<div className="flex items-center gap-1">
					{/* Block formatting */}
					<ToolbarButton
						icon={Heading1}
						isActive={activeStates.heading1}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleBlock(editor, "heading", 1);
						}}
						title="Heading 1 (Ctrl/Cmd+Shift+1)"
					/>
					<ToolbarButton
						icon={Heading2}
						isActive={activeStates.heading2}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleBlock(editor, "heading", 2);
						}}
						title="Heading 2 (Ctrl/Cmd+Shift+2)"
					/>
					<ToolbarButton
						icon={Heading3}
						isActive={activeStates.heading3}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleBlock(editor, "heading", 3);
						}}
						title="Heading 3"
					/>
					<ToolbarButton
						icon={List}
						isActive={activeStates.listItem}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleBlock(editor, "list-item");
						}}
						title="Bullet List"
					/>
					<ToolbarButton
						icon={Quote}
						isActive={activeStates.blockQuote}
						onMouseDown={(event) => {
							event.preventDefault();
							toggleBlock(editor, "block-quote");
						}}
						title="Quote"
					/>
				</div>
			</div>
			</div>
		</div>
	);
}
