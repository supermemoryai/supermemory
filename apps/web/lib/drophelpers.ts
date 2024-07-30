import {
	Editor,
	TLBookmarkShape,
	TLShapePartial,
	Vec,
	VecLike,
	createShapeId,
} from "tldraw";

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
