import { createTLStore, defaultShapeUtils, loadSnapshot } from "tldraw";
import { twitterCardUtil } from "../twitterCard";
import {textCardUtil} from "../textCard"
export async function loadRemoteSnapshot() {
  const res = await fetch(
    "https://learning-cf.pruthvirajthinks.workers.dev/get/page3",
  );
  const snapshot = JSON.parse(await res.json());
  const newStore = createTLStore({
    shapeUtils: [...defaultShapeUtils, twitterCardUtil, textCardUtil],
  });
  loadSnapshot(newStore, snapshot)
  return newStore;
}