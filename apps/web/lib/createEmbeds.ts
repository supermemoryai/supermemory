// @ts-nocheck TODO: A LOT OF TS ERRORS HERE

import {
	AssetRecordType,
	Editor,
	TLAsset,
	TLAssetId,
	TLBookmarkShape,
	TLExternalContentSource,
	TLShapePartial,
	Vec,
	VecLike,
	createShapeId,
	getEmbedInfo,
	getHashForString,
} from "tldraw";

export default async function createEmbedsFromUrl({
	url,
	point,
	sources,
	editor,
}: {
	url: string;
	point?: VecLike | undefined;
	sources?: TLExternalContentSource[] | undefined;
	editor: Editor;
}) {
	const position =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center);

	if (url?.includes("x.com") || url?.includes("twitter.com")) {
		return editor.createShape({
			type: "Twittercard",
			x: position.x - 250,
			y: position.y - 150,
			props: { url: url },
		});
	}

	// try to paste as an embed first
	const embedInfo = getEmbedInfo(url);

	if (embedInfo) {
		return editor.putExternalContent({
			type: "embed",
			url: embedInfo.url,
			point,
			embed: embedInfo.definition,
		});
	}

	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url));
	const shape = createEmptyBookmarkShape(editor, url, position);

	// Use an existing asset if we have one, or else else create a new one
	let asset = editor.getAsset(assetId) as TLAsset;
	let shouldAlsoCreateAsset = false;
	if (!asset) {
		shouldAlsoCreateAsset = true;
		try {
			const bookmarkAsset = await editor.getAssetForExternalContent({
				type: "url",
				url,
			});
			const fetchWebsite: {
				title?: string;
				image?: string;
				description?: string;
			} = await (
				await fetch(`/api/unfirlsite?website=${url}`, {
					method: "POST",
				})
			).json();
			if (bookmarkAsset) {
				if (fetchWebsite.title) bookmarkAsset.props.title = fetchWebsite.title;
				if (fetchWebsite.image) bookmarkAsset.props.image = fetchWebsite.image;
				if (fetchWebsite.description)
					bookmarkAsset.props.description = fetchWebsite.description;
			}
			if (!bookmarkAsset) throw Error("Could not create an asset");
			asset = bookmarkAsset;
		} catch (e) {
			console.log(e);
			return;
		}
	}

	editor.batch(() => {
		if (shouldAlsoCreateAsset) {
			editor.createAssets([asset]);
		}

		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: {
					assetId: asset.id,
				},
			},
		]);
	});
}

function isURL(str: string) {
	try {
		new URL(str);
		return true;
	} catch {
		return false;
	}
}

function formatTextToRatio(text: string) {
	const totalWidth = text.length;
	const maxLineWidth = Math.floor(totalWidth / 10);

	const words = text.split(" ");
	let lines = [];
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
	return { height: (lines.length + 1) * 18, width: maxLineWidth * 10 };
}

export function handleExternalDroppedContent({
	text,
	editor,
}: {
	text: string;
	editor: Editor;
}) {
	const position = editor.inputs.shiftKey
		? editor.inputs.currentPagePoint
		: editor.getViewportPageBounds().center;

	if (isURL(text)) {
		createEmbedsFromUrl({ editor, url: text });
	} else {
		// editor.createShape({
		//   type: "text",
		//   x: position.x - 75,
		//   y: position.y - 75,
		//   props: {
		//     text: text,
		//     size: "s",
		//     textAlign: "start",
		//   },
		// });
		const { height, width } = formatTextToRatio(text);
		editor.createShape({
			type: "Textcard",
			x: position.x - width / 2,
			y: position.y - height / 2,
			props: {
				content: text,
				extrainfo: "https://chatgpt.com/c/762cd44e-1752-495b-967a-aa3c23c6024a",
				w: width,
				h: height,
			},
		});
	}
}

function centerSelectionAroundPoint(editor: Editor, position: VecLike) {
	// Re-position shapes so that the center of the group is at the provided point
	const viewportPageBounds = editor.getViewportPageBounds();
	let selectionPageBounds = editor.getSelectionPageBounds();

	if (selectionPageBounds) {
		const offset = selectionPageBounds!.center.sub(position);

		editor.updateShapes(
			editor.getSelectedShapes().map((shape) => {
				const localRotation = editor
					.getShapeParentTransform(shape)
					.decompose().rotation;
				const localDelta = Vec.Rot(offset, -localRotation);
				return {
					id: shape.id,
					type: shape.type,
					x: shape.x! - localDelta.x,
					y: shape.y! - localDelta.y,
				};
			}),
		);
	}

	// Zoom out to fit the shapes, if necessary
	selectionPageBounds = editor.getSelectionPageBounds();
	if (
		selectionPageBounds &&
		!viewportPageBounds.contains(selectionPageBounds)
	) {
		editor.zoomToSelection();
	}
}

export function createEmptyBookmarkShape(
	editor: Editor,
	url: string,
	position: VecLike,
): TLBookmarkShape {
	const partial: TLShapePartial = {
		id: createShapeId(),
		type: "bookmark",
		x: position.x - 150,
		y: position.y - 160,
		opacity: 1,
		props: {
			assetId: null,
			url,
		},
	};

	editor.batch(() => {
		editor.createShapes([partial]).select(partial.id);
		centerSelectionAroundPoint(editor, position);
	});

	return editor.getShape(partial.id) as TLBookmarkShape;
}
