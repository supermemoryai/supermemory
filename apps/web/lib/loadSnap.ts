import { createTLStore, defaultShapeUtils, loadSnapshot } from "tldraw";
import { getCanvasData } from "../app/actions/fetchers";
// import { twitterCardUtil } from "../components/canvas/custom_nodes/twitterCard";
import { twitterCardUtil } from "@/components/canvas/custom_nodes/twittercard";
import { textCardUtil } from "@/components/canvas/custom_nodes/textcard";

export async function loadRemoteSnapshot(id: string) {
	const snapshot = await getCanvasData(id);

	const newStore = createTLStore({
		shapeUtils: [...defaultShapeUtils, twitterCardUtil, textCardUtil],
	});
	loadSnapshot(newStore, snapshot.snapshot);
	return newStore;
}
