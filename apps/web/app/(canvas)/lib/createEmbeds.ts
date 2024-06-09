import { AssetRecordType, Editor, TLAsset, TLAssetId, TLBookmarkShape, TLExternalContentSource, TLShapePartial, Vec, VecLike, createShapeId, getEmbedInfo, getHashForString } from "tldraw";

export default async function createEmbedsFromUrl({url, point, sources, editor}: {
  url: string
  point: VecLike | undefined
  sources: TLExternalContentSource[] | undefined
  editor: Editor
}){

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

    const assetId: TLAssetId = AssetRecordType.createId(
      getHashForString(url),
    );
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
        const fetchWebsite = await (await fetch(`https://unfurl-bookmark.pruthvirajthinks.workers.dev/?url=${url}`)).json()
        if (fetchWebsite.title) bookmarkAsset.props.title = fetchWebsite.title;
        if (fetchWebsite.image) bookmarkAsset.props.image = fetchWebsite.image;
        if (fetchWebsite.description) bookmarkAsset.props.description = fetchWebsite.description;
        if (!bookmarkAsset) throw Error("Could not create an asset");
        asset = bookmarkAsset;
      } catch (e) {
        console.log(e)
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

function centerSelectionAroundPoint(editor: Editor, position: VecLike) {
	// Re-position shapes so that the center of the group is at the provided point
	const viewportPageBounds = editor.getViewportPageBounds()
	let selectionPageBounds = editor.getSelectionPageBounds()

	if (selectionPageBounds) {
		const offset = selectionPageBounds!.center.sub(position)

		editor.updateShapes(
			editor.getSelectedShapes().map((shape) => {
				const localRotation = editor.getShapeParentTransform(shape).decompose().rotation
				const localDelta = Vec.Rot(offset, -localRotation)
				return {
					id: shape.id,
					type: shape.type,
					x: shape.x! - localDelta.x,
					y: shape.y! - localDelta.y,
				}
			})
		)
	}

	// Zoom out to fit the shapes, if necessary
	selectionPageBounds = editor.getSelectionPageBounds()
	if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
		editor.zoomToSelection()
	}
}

export function createEmptyBookmarkShape(
	editor: Editor,
	url: string,
	position: VecLike
): TLBookmarkShape {
	const partial: TLShapePartial = {
		id: createShapeId(),
		type: 'bookmark',
		x: position.x - 150,
		y: position.y - 160,
		opacity: 1,
		props: {
			assetId: null,
			url,
		},
	}

	editor.batch(() => {
		editor.createShapes([partial]).select(partial.id)
		centerSelectionAroundPoint(editor, position)
	})

	return editor.getShape(partial.id) as TLBookmarkShape
}