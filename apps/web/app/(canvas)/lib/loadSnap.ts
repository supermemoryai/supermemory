import { createTLStore, defaultShapeUtils } from "tldraw";
import { twitterCardUtil } from "../twitterCard";
export async function loadRemoteSnapshot() {
  const res = await fetch(
    "https://learning-cf.pruthvirajthinks.workers.dev/get/page3",
  );
  const snapshot = JSON.parse(await res.json());
  const newStore = createTLStore({
    shapeUtils: [...defaultShapeUtils, twitterCardUtil],
  });
  newStore.loadSnapshot(snapshot);
  return newStore;
}