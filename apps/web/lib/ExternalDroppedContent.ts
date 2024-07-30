import { Editor } from "tldraw";
import createEmbedsFromUrl from "./createEmbeds";

function processURL(input: string): string | null {
	let str = input.trim();
	if (!/^(?:f|ht)tps?:\/\//i.test(str)) {
		str = "http://" + str;
	}
	try {
		const url = new URL(str);
		return url.href;
	} catch {
		return str.match(
			/^(https?:\/\/)?(www\.)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\/.*)?$/i,
		)
			? str
			: null;
	}
}

function formatContent(title: string, content: string): string {
	const totalLength = title.length + content.length;
	const totalHeight = Math.ceil(totalLength * (2 / 3));
	const titleLines = Math.ceil(totalHeight * (2 / 5));
	const contentLines = totalHeight - titleLines;

	const titleWithNewLines = title + "\n".repeat(titleLines);
	const contentWithNewLines = content + "\n".repeat(contentLines);

	return `${titleWithNewLines.trim()}\n\n${contentWithNewLines.trim()}`;
}

function formatTextToRatio(text: string): { height: number; width: number } {
	const RATIO = 4 / 3;
	const FONT_SIZE = 15;
	const CHAR_WIDTH = FONT_SIZE * 0.6;
	const LINE_HEIGHT = FONT_SIZE * 1.2;
	const MIN_WIDTH = 200;

	let width = Math.min(
		800,
		Math.max(MIN_WIDTH, Math.ceil(text.length * CHAR_WIDTH)),
	);

	width = Math.ceil(width / 4) * 4;

	const maxLineWidth = Math.floor(width / CHAR_WIDTH);

	const words = text.split(" ");
	let lines: string[] = [];
	let currentLine = "";

	words.forEach((word) => {
		if ((currentLine + word).length <= maxLineWidth) {
			currentLine += (currentLine ? " " : "") + word;
		} else {
			lines.push(currentLine);
			currentLine = word;
		}
	});
	if (currentLine) {
		lines.push(currentLine);
	}

	let height = Math.ceil(lines.length * LINE_HEIGHT);

	if (width / height > RATIO) {
		width = Math.ceil(height * RATIO);
	} else {
		height = Math.ceil(width / RATIO);
	}

	return { height, width };
}

type CardData = {
	title: string;
	type: string;
	content: string;
	text: boolean;
};

type DroppedData = CardData | string | { imageUrl: string };

export function handleExternalDroppedContent({
	droppedData,
	editor,
}: {
	droppedData: DroppedData;
	editor: Editor;
}) {
	const position = editor.inputs.shiftKey
		? editor.inputs.currentPagePoint
		: editor.getViewportPageBounds().center;

	if (typeof droppedData === "string") {
		const processedURL = processURL(droppedData);
		if (processedURL) {
			createEmbedsFromUrl({ editor, url: processedURL });
		} else {
			createTextCard(editor, position, droppedData, "String Content");
		}
	} else if ("imageUrl" in droppedData) {
	} else {
		const { content, title, type, text } = droppedData;
		if (text) {
			const { height, width } = formatTextToRatio(content);
			editor.createShape({
				type: "text",
				x: position.x - width / 2,
				y: position.y - height / 2,
				props: { text: formatContent(title, content) },
			});
		} else {
			createTextCard(editor, position, title, type, content);
		}
	}
}

function createTextCard(
	editor: Editor,
	position: { x: number; y: number },
	content: string,
	type: string,
	extraInfo: string = "",
) {
	const { height, width } = formatTextToRatio(content);
	editor.createShape({
		type: "Textcard",
		x: position.x - width / 2,
		y: position.y - height / 2,
		props: { content, type, extrainfo: extraInfo, h: 200, w: 400 },
	});
}
