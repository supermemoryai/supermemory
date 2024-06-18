import { useCallback, useEffect, useMemo, useState } from "react";
import { Editor, Tldraw, setUserPreferences, TLStoreWithStatus } from "tldraw";
import { createAssetFromUrl } from "./lib/createAssetUrl";
import "tldraw/tldraw.css";
import { components } from "./enabledComp";
import { twitterCardUtil } from "./twitterCard";
import createEmbedsFromUrl from "./lib/createEmbeds";
import { loadRemoteSnapshot } from "./lib/loadSnap";
import { SaveStatus } from "./savesnap";
import { getAssetUrls } from '@tldraw/assets/selfHosted'
import { memo } from 'react';

export const Canvas = memo(()=>{
  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });
  useEffect(() => {
    const fetchStore = async () => {
      const store = await loadRemoteSnapshot();

      setStoreWithStatus({
        store: store,
        status: "not-synced",
      });
    };

    fetchStore();
  }, []);

  const handleMount = useCallback((editor: Editor) => {
    (window as any).app = editor;
    (window as any).editor = editor;
    editor.registerExternalAssetHandler("url", createAssetFromUrl);
    editor.registerExternalContentHandler("url", ({ url, point, sources }) => {
      createEmbedsFromUrl({ url, point, sources, editor });
    });
  }, []);

  setUserPreferences({ id: "supermemory", isDarkMode: true });

  const assetUrls = getAssetUrls()
  return (
    <Tldraw
      assetUrls={assetUrls}
      components={components}
      store={storeWithStatus}
      shapeUtils={[twitterCardUtil]}
      onMount={handleMount}
    >
      <div className="absolute left-1/2 top-0 z-[1000000] flex -translate-x-1/2 gap-2 bg-[#2C3439] text-[#B3BCC5]">
        <SaveStatus />
      </div>
    </Tldraw>
  );
})
