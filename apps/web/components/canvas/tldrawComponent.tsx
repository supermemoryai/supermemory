import React, {
	createContext,
	memo,
	useCallback,
	useEffect,
	useState,
} from "react";
import { Editor, TLStoreWithStatus, Tldraw, setUserPreferences } from "tldraw";
import { components } from "./enabled";
import { twitterCardUtil } from "./custom_nodes/twittercard";
import { textCardUtil } from "./custom_nodes/textcard";
import DropZone from "./tldrawDrop";
import { loadRemoteSnapshot } from "@/lib/loadSnap";
import { createAssetFromUrl } from "@/lib/createAssetUrl";
import { SaveStatus } from "./savesnap";
import createEmbedsFromUrl from "@/lib/createEmbeds";

interface DragContextType {
	isDraggingOver: boolean;
	setIsDraggingOver: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DragContext = createContext<DragContextType | undefined>(
	undefined,
);

function TldrawComponent({ id }: { id: string }) {
	const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
	return (
		<DragContext.Provider value={{ isDraggingOver, setIsDraggingOver }}>
			<div className="h-[98vh]" onDragOver={() => setIsDraggingOver(true)}>
				<Thinkpad id={id} />
			</div>
		</DragContext.Provider>
	);
}

export const Thinkpad = memo(({ id }: { id: string }) => {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
		status: "loading",
	});
	useEffect(() => {
		const fetchStore = async () => {
			const store = await loadRemoteSnapshot(id);

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

	setUserPreferences({ id: "supermemory", colorScheme: "dark" });

	return (
		<Tldraw
			className="relative"
			components={components}
			store={storeWithStatus}
			shapeUtils={[twitterCardUtil, textCardUtil]}
			onMount={handleMount}
		>
			<DropZone />
			<div className="absolute left-1/2 top-0 z-[1000000] flex -translate-x-1/2 gap-2 bg-[#2C3439] text-[#B3BCC5]">
				<SaveStatus id={id} />
			</div>
		</Tldraw>
	);
});

export default TldrawComponent;
