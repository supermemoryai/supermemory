import { Button } from "../ui/button";
import { PopoverContent } from "../ui/popover";
import { cn } from "@repo/ui/lib/utils";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import { Check, Trash } from "lucide-react";
import { useEditor } from "novel";
import { useEffect, useRef } from "react";

export function isValidUrl(url: string) {
	try {
		new URL(url);
		return true;
	} catch (_e) {
		return false;
	}
}
export function getUrlFromString(str: string) {
	if (isValidUrl(str)) return str;
	try {
		if (str.includes(".") && !str.includes(" ")) {
			return new URL(`https://${str}`).toString();
		}
	} catch (_e) {
		return null;
	}
}
interface LinkSelectorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const LinkSelector = ({ open, onOpenChange }: LinkSelectorProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const { editor } = useEditor();

	// Autofocus on input by default
	useEffect(() => {
		inputRef.current?.focus();
	});
	if (!editor) return null;

	return (
		<Popover modal={true} open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					size="sm"
					variant="ghost"
					className="gap-2 group rounded-none border-none hover:bg-[#21303D]"
				>
					<p
						className={cn(
							"underline text-gray-400 group-hover:text-[#369DFD] underline-offset-4",
							{
								"text-white": editor.isActive("link"),
							},
						)}
					>
						↗
					</p>
					<p
						className={cn(
							"underline text-gray-400 group-hover:text-[#369DFD] underline-offset-4",
							{
								"text-white": editor.isActive("link"),
							},
						)}
					>
						Link
					</p>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-60 p-0 bg-[#1F2428] border-0 shadow-md"
				sideOffset={10}
			>
				<form
					onSubmit={(e) => {
						const target = e.currentTarget as HTMLFormElement;
						e.preventDefault();
						const input = target[0] as HTMLInputElement;
						const url = getUrlFromString(input.value);
						if (url) {
							editor.chain().focus().setLink({ href: url }).run();
							onOpenChange(false);
						}
					}}
					className="flex  p-1 "
				>
					<input
						ref={inputRef}
						type="text"
						placeholder="Paste a link"
						className="flex-1 bg-background p-1 text-sm outline-none text-white px-2 py-1"
						defaultValue={editor.getAttributes("link").href || ""}
					/>
					{editor.getAttributes("link").href ? (
						<Button
							size="icon"
							variant="outline"
							type="button"
							className="flex h-8 border-0 items-center rounded-sm p-1 text-red-600 hover:text-red-600 hover:bg-red-950"
							onClick={() => {
								editor.chain().focus().unsetLink().run();
								inputRef.current.value = "";
								onOpenChange(false);
							}}
						>
							<Trash className="h-4 w-4" />
						</Button>
					) : (
						<Button size="icon" className="h-8 px-2">
							<Check className="h-4 w-4" />
						</Button>
					)}
				</form>
			</PopoverContent>
		</Popover>
	);
};
