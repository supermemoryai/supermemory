import { createTLStore, defaultShapeUtils, loadSnapshot } from "tldraw";
import { twitterCardUtil } from "../(components)/twitterCard";
import { textCardUtil } from "../(components)/textCard";
import { getCanvasData } from "@/app/actions/fetchers";
export async function loadRemoteSnapshot(id:string) {
  const snapshot = await getCanvasData(id);

  const newStore = createTLStore({
    shapeUtils: [...defaultShapeUtils, twitterCardUtil, textCardUtil],
  });
  loadSnapshot(newStore, snapshot);
  return newStore;
}
