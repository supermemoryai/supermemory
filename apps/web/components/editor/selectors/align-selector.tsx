import { Check, ChevronDown, LucideIcon } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";

import { Button } from "../ui/button";
import { PopoverContent, PopoverTrigger } from "../ui/popover";
import { Popover } from "@radix-ui/react-popover";

export type SelectorItem = {
	name: string;
	command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
	isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
};

const items: SelectorItem[] = [
	{
		name: "left",
		command: (editor) => editor.chain().focus().setTextAlign("left").run(),
		isActive: (editor) => editor.isActive({ textAlign: "left" }),
	},
	{
		name: "center",
		command: (editor) => editor.chain().focus().setTextAlign("center").run(),
		isActive: (editor) => editor.isActive({ textAlign: "center" }),
	},
	{
		name: "right",
		command: (editor) => editor.chain().focus().setTextAlign("right").run(),
		isActive: (editor) => editor.isActive({ textAlign: "right" }),
	},
	{
		name: "justify",
		command: (editor) => editor.chain().focus().setTextAlign("justify").run(),
		isActive: (editor) => editor.isActive({ textAlign: "justify" }),
	},
];

interface AlignSelectorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const AlignSelector = ({ open, onOpenChange }: AlignSelectorProps) => {
	const { editor } = useEditor();
	if (!editor) return null;
	const activeItem = items.filter((item) => item.isActive(editor)).pop() ?? {
		name: "Multiple",
	};

	return (
		<Popover modal={true} open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger
				asChild
				className="gap-2 rounded-none border-none hover:bg-[#21303D] group focus:ring-0"
			>
				<Button size="sm" variant="ghost" className="gap-2">
					<span className="whitespace-nowrap text-sm text-gray-400 group-hover:text-[#369DFD]">
						{activeItem.name}
					</span>
					<ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-[#369DFD]" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				sideOffset={5}
				align="start"
				className="w-48 p-1 bg-[#1F2428] border-0"
			>
				{items.map((item) => (
					<EditorBubbleItem
						key={item.name}
						onSelect={(editor) => {
							item.command(editor);
							onOpenChange(false);
						}}
						className="flex border-0 group cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-[#21303D]"
					>
						<div className="flex items-center space-x-2 text-white group-hover:text-[#369DFD]">
							<span>{item.name}</span>
						</div>
						{activeItem.name === item.name && (
							<Check className="h-4 w-4 text-white" />
						)}
					</EditorBubbleItem>
				))}
			</PopoverContent>
		</Popover>
	);
};
