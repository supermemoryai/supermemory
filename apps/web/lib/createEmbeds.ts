import {
	AssetRecordType,
	Editor,
	TLAsset,
	TLAssetId,
	TLExternalContentSource,
	VecLike,
	getEmbedInfo,
	getHashForString,
} from "tldraw";
import { createEmptyBookmarkShape } from "./drophelpers";
import { unfirlSite } from "@/app/actions/fetchers";

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

	const urlPattern = /https?:\/\/(x\.com|twitter\.com)\/[\w]+\/[\w]+\/[\d]+/;
	if (urlPattern.test(url)) {
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

	let asset = editor.getAsset(assetId) as TLAsset;
	let shouldAlsoCreateAsset = false;
	if (!asset) {
		shouldAlsoCreateAsset = true;
		try {
			const bookmarkAsset = await editor.getAssetForExternalContent({
				type: "url",
				url,
			});
			const value = await unfirlSite(url);
			if (bookmarkAsset) {
				if (bookmarkAsset.type === "bookmark") {
					if (value.title) bookmarkAsset.props.title = value.title;
					if (value.image) bookmarkAsset.props.image = value.image;
					if (value.description)
						bookmarkAsset.props.description = value.description;
				}
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
