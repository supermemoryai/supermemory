import { lazy, memo, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { OpenAIProvider } from "~/components/editor/use-chat";
import { useCreateEditor } from "~/components/editor/use-create-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useLiveTranscript } from "~/lib/hooks/use-live-transcript";
import { Theme, useTheme } from "~/lib/theme-provider";

const PlateEditorImport = lazy(() =>
	import("@udecode/plate-common/react").then((mod) => ({ default: mod.Plate })),
);

const EditorContainerImport = lazy(() =>
	import("~/components/plate-ui/editor").then((mod) => ({ default: mod.EditorContainer })),
);

const EditorImport = lazy(() =>
	import("~/components/plate-ui/editor").then((mod) => ({ default: mod.Editor })),
);

const Plate = memo(PlateEditorImport);
const EditorContainer = memo(EditorContainerImport);
const Editor = memo(EditorImport);

export function WritingPlayground() {
	if (typeof window === "undefined") {
		return <div>Loading...</div>;
	}
	const localValue = localStorage.getItem("editorContent");
	const editor = useCreateEditor({ initialValue: localValue ? JSON.parse(localValue) : undefined });

	const [theme, setTheme] = useTheme();

	useEffect(() => {
		setTheme(Theme.LIGHT);
	}, [theme, setTheme]);

	const { toggleMicrophone, caption, status, isListening, isLoading } = useLiveTranscript();

	const { messages, input, handleInputChange, handleSubmit } = useChat({
		id: "editor",
		api: "/api/ai/command",
		initialMessages: [
			{
				id: "1",
				content: "Hi! I am here to help you quickly find what you're looking for.",
				role: "assistant",
			},
			{
				id: "2",
				content: "Just drop a question when you need me, ok?",
				role: "assistant",
			},
		],
		keepLastMessageOnError: true,
		// @ts-expect-error
		experimental_prepareRequestBody: (request) => {
			// messages with the documentation content
			// @ts-expect-error
			const markdown = editor.api.markdown.serialize();
			console.log(JSON.stringify(editor.children));
			console.log(markdown);
			return {
				messages: [
					...request.messages,
					{
						id: "3",
						content: `Here is the documentation for the company: ${markdown}`,
						role: "user",
					} satisfies Message,
				],
			};
		},
	});

	const [lastProcessedLength, setLastProcessedLength] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);
	const updateTimeoutRef = useRef<NodeJS.Timeout>();

	useEffect(() => {
		if (!isListening) {
			return;
		}
		// Clear existing timeout
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current);
		}

		const currentSentences = caption.split(".").length;

		// Only process if we have new sentences and aren't currently processing
		if (currentSentences > lastProcessedLength && !isProcessing) {
			// Debounce the update for 2 seconds
			updateTimeoutRef.current = setTimeout(async () => {
				setIsProcessing(true);
				try {
					const result = await fetch("/api/ai/update", {
						method: "POST",
						body: JSON.stringify({ caption, document: editor.children }),
					});
					const data = (await result.json()) as {
						action: "edit" | "delete" | "append" | "ignore";
						blockId?: string;
						content?: string;
						reason: string;
					};
					if (data.action === "ignore") {
						return;
					}
					if (data.action === "edit") {
						// Make a copy of the editor children
						const newChildren = [...editor.children];
						// Find and update the block in the copy
						const blockIndex = newChildren.findIndex((block) => block.id === data.blockId);
						if (blockIndex !== -1) {
							newChildren[blockIndex] = {
								...newChildren[blockIndex],
								children: [{ text: data.content ?? "" }],
							};
						}
						editor.tf.setValue(newChildren);
					} else if (data.action === "delete") {
						// Make a copy of the editor children and filter out the block
						const newChildren = editor.children.filter((block) => block.id !== data.blockId);
						editor.tf.setValue(newChildren);
					} else if (data.action === "append") {
						editor.tf.setValue([
							...editor.children,
							{
								type: "paragraph",
								children: [{ text: data.content ?? "" }],
							},
						]);
					}
					setLastProcessedLength(currentSentences);
				} catch (error) {
					console.error("Error updating editor:", error);
				} finally {
					setIsProcessing(false);
				}
			}, 2000);
		}

		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, [caption, editor, lastProcessedLength, isProcessing]);

	return (
		<div className="grid gap-4 grid-cols-2">
			<Tabs defaultValue="docs">
				<TabsList className="absolute top-12 left-12 z-50">
					<TabsTrigger value="docs">Docs</TabsTrigger>
					<TabsTrigger value="transcript">Transcript</TabsTrigger>

					<div className="flex items-center gap-2">
						<button
							onClick={toggleMicrophone}
							className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
								isListening
									? "bg-red-500 hover:bg-red-600"
									: "bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
							}`}
							title={isListening ? "Stop recording" : "Start recording"}
						>
							<div className={`w-3 h-3 rounded-full ${isListening ? "bg-white" : "bg-red-500"}`} />
						</button>
						<span className="text-sm text-zinc-600 dark:text-zinc-400">{status}</span>
					</div>
				</TabsList>
				<div
					className="h-screen col-span-1 dark:caret-white relative overflow-auto"
					data-registry="plate"
				>
					<TabsContent value="docs">
						<OpenAIProvider>
							<DndProvider backend={HTML5Backend}>
								<Plate
									onChange={({ value }) => {
										// For performance, debounce your saving logic
										localStorage.setItem("editorContent", JSON.stringify(value));
									}}
									editor={editor}
								>
									<EditorContainer className="w-full border">
										<Editor variant="default" />
									</EditorContainer>
								</Plate>
							</DndProvider>
						</OpenAIProvider>
					</TabsContent>
					<TabsContent value="transcript">
						<div className="h-screen p-16 pt-24">{caption}</div>
					</TabsContent>
				</div>
			</Tabs>
			<div className="h-screen col-span-1 border flex flex-col">
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[80%] rounded-xl p-3 ${
									message.role === "user"
										? "bg-zinc-900 text-white"
										: "bg-zinc-100 dark:bg-zinc-800"
								}`}
							>
								{message.content}
							</div>
						</div>
					))}
				</div>
				<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
					<form onSubmit={handleSubmit} className="flex gap-2">
						<input
							name="prompt"
							value={input}
							onChange={handleInputChange}
							placeholder="Type a message..."
							className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 focus:outline-none focus:ring-1 bg-zinc-100 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-white"
						/>
						<button
							type="submit"
							className="rounded-xl bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
						>
							Send
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}