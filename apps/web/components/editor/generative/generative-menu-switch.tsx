import { EditorBubble, useEditor } from "novel";
import { removeAIHighlight } from "novel/extensions";
import {} from "novel/plugins";
import React, { Fragment, type ReactNode, useEffect } from "react";
import { Button } from "../ui/button";
import Magic from "../ui/icons/magic";
import { AISelector } from "./ai-selector";

interface GenerativeMenuSwitchProps {
	children: ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}
const GenerativeMenuSwitch = ({
	children,
	open,
	onOpenChange,
}: GenerativeMenuSwitchProps) => {
	const { editor } = useEditor();

	useEffect(() => {
		if (!editor) return;
		if (!open) removeAIHighlight(editor);
	}, [open]);
	return (
		<EditorBubble
			tippyOptions={{
				placement: open ? "bottom-start" : "top",
				onHidden: () => {
					onOpenChange(false);
					editor?.chain().unsetHighlight().run();
				},
			}}
			className="flex w-fit max-w-[90vw] overflow-hidden rounded-md bg-[#1F2428] shadow-xl"
		>
			{open && <AISelector open={open} onOpenChange={onOpenChange} />}
			{!open && (
				<Fragment>
					<Button
						className="gap-1 rounded-none text-purple-500"
						variant="ghost"
						onClick={() => onOpenChange(true)}
						size="sm"
					>
						<Magic className="h-5 w-5" />
						Ask AI
					</Button>
					{children}
				</Fragment>
			)}
		</EditorBubble>
	);
};

function AILessBubbleMenu({ children }: { children: React.ReactNode }) {
	const { editor } = useEditor();
	if (!editor) {
		return null;
	}

	return (
		<EditorBubble
			tippyOptions={{
				placement: "top",
				onHidden: () => {
					editor.chain().unsetHighlight().run();
				},
			}}
			className="flex w-fit max-w-[90vw] overflow-hidden rounded-md bg-[#1F2428] shadow-xl"
		>
			{children}
		</EditorBubble>
	);
}

export default AILessBubbleMenu;
