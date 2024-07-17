import { createTLStore, defaultShapeUtils, loadSnapshot } from "tldraw";
import { getCanvasData } from "../app/actions/fetchers";
import { twitterCardUtil } from "../components/canvas/twitterCard";
import { textCardUtil } from "../components/canvas/textCard";

export async function loadRemoteSnapshot(id: string) {
	const snapshot = await getCanvasData(id);

	const newStore = createTLStore({
		shapeUtils: [...defaultShapeUtils, twitterCardUtil, textCardUtil],
	});
	loadSnapshot(newStore, snapshot.snapshot);
	return newStore;
}
