import React, { useRef, useCallback, useEffect, useContext } from "react";
import { useEditor } from "tldraw";
import DragContext, {
	DragContextType,
	useDragContext,
} from "../../lib/context";
import { handleExternalDroppedContent } from "../../lib/createEmbeds";

const stripHtmlTags = (html: string): string => {
	const div = document.createElement("div");
	div.innerHTML = html;
	return div.textContent || div.innerText || "";
};

function formatTextToRatio(text: string) {
	const totalWidth = text.length;
	const maxLineWidth = Math.floor(totalWidth / 4);

	const words = text.split(" ");
	let lines = [];
	let currentLine = "";

	words.forEach((word) => {
		// Check if adding the next word exceeds the maximum line width
		if ((currentLine + word).length <= maxLineWidth) {
			currentLine += (currentLine ? " " : "") + word;
		} else {
			// If the current line is full, push it to new line
			lines.push(currentLine);
			currentLine = word;
		}
	});
	if (currentLine) {
		lines.push(currentLine);
	}
	return lines.join("\n");
}

function DropZone() {
	const dropRef = useRef<HTMLDivElement | null>(null);
	const { isDraggingOver, setIsDraggingOver } = useDragContext();

	const editor = useEditor();

	const handleDragLeave = () => {
		setIsDraggingOver(false);
		console.log("leaver");
	};

	useEffect(() => {
		setInterval(() => {
			editor.selectAll();
			const shapes = editor.getSelectedShapes();
			const text = shapes.filter((s) => s.type === "text");
			console.log("hrhh", text);
		}, 5000);
	}, []);

	const handleDrop = useCallback((event: DragEvent) => {
		event.preventDefault();
		setIsDraggingOver(false);
		const dt = event.dataTransfer;
		if (!dt) {
			return;
		}
		const items = dt.items;

		for (let i = 0; i < items.length; i++) {
			if (items[i]!.kind === "file" && items[i]!.type.startsWith("image/")) {
				const file = items[i]!.getAsFile();
				if (file) {
					const reader = new FileReader();
					reader.onload = (e) => {
						if (e.target) {
							// setDroppedImage(e.target.result as string);
						}
					};
					reader.readAsDataURL(file);
				}
			} else if (items[i]!.kind === "string") {
				items[i]!.getAsString((data) => {
					const cleanText = stripHtmlTags(data);
					const onethree = formatTextToRatio(cleanText);
					handleExternalDroppedContent({ editor, text: onethree });
				});
			}
		}
	}, []);

	useEffect(() => {
		const divElement = dropRef.current;
		if (divElement) {
			divElement.addEventListener("drop", handleDrop);
			divElement.addEventListener("dragleave", handleDragLeave);
		}
		return () => {
			if (divElement) {
				divElement.removeEventListener("drop", handleDrop);
				divElement.addEventListener("dragleave", handleDragLeave);
			}
		};
	}, []);

	return (
		<div
			className={`h-full flex justify-center items-center w-full absolute top-0 left-0 z-[100000] pointer-events-none  ${isDraggingOver && "bg-[#2c3439ad]  pointer-events-auto"}`}
			ref={dropRef}
		>
			{isDraggingOver && (
				<>
					<div className="absolute top-4 left-8">
						<TopRight />
					</div>
					<div className="absolute top-4 right-8">
						<TopLeft />
					</div>
					<div className="absolute bottom-4 left-8">
						<BottomLeft />
					</div>
					<div className="absolute bottom-4 right-8">
						<BottomRight />
					</div>
					<h2 className="text-2xl">Drop here to add Content on Canvas</h2>
				</>
			)}
		</div>
	);
}

function TopRight() {
	return (
		<svg
			width="48"
			height="48"
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M44 4H12C7.58172 4 4 7.58172 4 12V44"
				stroke="white"
				stroke-width="8"
				stroke-linecap="round"
			/>
		</svg>
	);
}

function TopLeft() {
	return (
		<svg
			width="48"
			height="48"
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M4 4H36C40.4183 4 44 7.58172 44 12V44"
				stroke="white"
				stroke-width="8"
				stroke-linecap="round"
			/>
		</svg>
	);
}

function BottomLeft() {
	return (
		<svg
			width="48"
			height="48"
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M44 44H12C7.58172 44 4 40.4183 4 36V4"
				stroke="white"
				stroke-width="8"
				stroke-linecap="round"
			/>
		</svg>
	);
}

function BottomRight() {
	return (
		<svg
			width="48"
			height="48"
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M4 44H36C40.4183 44 44 40.4183 44 36V4"
				stroke="white"
				stroke-width="8"
				stroke-linecap="round"
			/>
		</svg>
	);
}

export default DropZone;
