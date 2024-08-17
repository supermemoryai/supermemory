"use client";
import { defaultEditorContent } from "./content";
import "./prosemirror.css";
import {
	EditorCommand,
	EditorCommandEmpty,
	EditorCommandItem,
	EditorCommandList,
	EditorContent,
	type EditorInstance,
	EditorRoot,
	type JSONContent,
	useEditor,
} from "novel";
import { ImageResizer, handleCommandNavigation } from "novel/extensions";
import { memo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { LinkSelector } from "./selectors/link-selector";
import { NodeSelector } from "./selectors/node-selector";
import { Separator } from "./ui/separator";

import { handleImageDrop, handleImagePaste } from "novel/plugins";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";
import { ToC } from "./toc";
import {
	getHierarchicalIndexes,
	TableOfContents,
} from "@tiptap-pro/extension-table-of-contents";
import { AlignSelector } from "./selectors/align-selector";
import { useFormStatus } from "react-dom";
import { Button } from "@repo/ui/shadcn/button";

const MemorizedToC = memo(ToC);

const hljs = require("highlight.js");

type tContent = {
	id: string;
	textContent: string;
	level: number;
	isActive: boolean;
	itemIndex: number;
	isScrolledOver: boolean;
	pos: number;
};

const TailwindAdvancedEditor = memo(
	({ setContent }: { setContent: (e: string) => void }) => {
		const [openNode, setOpenNode] = useState(false);
		const [openAlign, setOpenAlign] = useState(false);
		const [openLink, setOpenLink] = useState(false);
		const [items, setItems] = useState<tContent[]>([]);

		const extensions = [
			...defaultExtensions,
			slashCommand,
			TableOfContents.configure({
				getIndex: getHierarchicalIndexes,
				onUpdate(content) {
					console.log(content);
					setItems(content);
				},
			}),
		];

		return (
			<div className="relative w-full h-full bg-[#171B1F]">
				<EditorRoot>
					<EditorContent
						autofocus
						initialContent={defaultEditorContent}
						extensions={extensions}
						className="relative w-full h-full py-10 max-w-5xl m-auto overflow-auto bg-transparent sm:rounded-lg sm:shadow-lg"
						editorProps={{
							handleDOMEvents: {
								keydown: (_view, event) => handleCommandNavigation(event),
							},
							// handlePaste: (view, event) =>
							// 	handleImagePaste(view, event, uploadFn),
							// handleDrop: (view, event, _slice, moved) =>
							// 	handleImageDrop(view, event, moved, uploadFn),
							attributes: {
								class:
									"prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
							},
						}}
						// onUpdate={({ editor }) => {

						// }}
						slotAfter={<ImageResizer />}
					>
						<MemorizedToC items={items} />
						<EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md bg-[#1F2428] px-1 py-2 shadow-md transition-all">
							<EditorCommandEmpty className="px-2 text-muted-foreground">
								No results
							</EditorCommandEmpty>
							<EditorCommandList>
								{suggestionItems.map((item) => (
									<EditorCommandItem
										value={item.title}
										onCommand={(val) => item.command(val)}
										className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-[#21303D] group aria-selected:bg-[#21303D]"
										key={item.title}
									>
										<div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#2D343A] group-hover:bg-[#369DFD33] group-aria-selected:bg-[#369DFD33]">
											{item.icon}
										</div>
										<div>
											<p className="font-medium text-[#FFFFFF] group-hover:text-[#369DFD] group-aria-selected:text-[#369DFD]">
												{item.title}
											</p>
											<p className="text-xs text-[#989EA4] group-hover:text-[#369DFDB2] group-aria-selected:text-[#369DFDB2]">
												{item.description}
											</p>
										</div>
									</EditorCommandItem>
								))}
							</EditorCommandList>
						</EditorCommand>

						<GenerativeMenuSwitch>
							<Separator orientation="vertical" />
							<NodeSelector open={openNode} onOpenChange={setOpenNode} />
							<Separator orientation="vertical" />
							<AlignSelector open={openAlign} onOpenChange={setOpenAlign} />
							<Separator orientation="vertical" />

							<LinkSelector open={openLink} onOpenChange={setOpenLink} />
							<Separator orientation="vertical" />
							<Separator orientation="vertical" />
							<TextButtons />
						</GenerativeMenuSwitch>
						<SaveNote setContent={setContent} />
					</EditorContent>
				</EditorRoot>
			</div>
		);
	},
);

function SaveNote({ setContent }: { setContent: (e: string) => void }) {
	const { editor } = useEditor();
	if (!editor) return null;
	return (
		<Button
			className="fixed bottom-6 right-5"
			onClick={() => setContent(editor.storage.markdown.getMarkdown())}
			variant={"secondary"}
		>
			Save Note
		</Button>
	);
}

// function SubmitButton({ autoDetectedType }: { autoDetectedType: string }) {
// 	return (

// 	);
// }
export default TailwindAdvancedEditor;
