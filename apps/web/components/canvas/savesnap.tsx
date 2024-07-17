import { useCallback, useEffect, useState } from "react";
import { debounce, getSnapshot, useEditor } from "tldraw";
import { SaveCanvas } from "@/app/actions/doers";

export function SaveStatus({ id }: { id: string }) {
	const [save, setSave] = useState("saved!");
	const editor = useEditor();

	const debouncedSave = useCallback(
		debounce(async () => {
			const snapshot = getSnapshot(editor.store);
			const bounds = editor.getViewportPageBounds();
			console.log(bounds);

			SaveCanvas({ id, data: JSON.stringify({ snapshot, bounds }) });

			setSave("saved!");
		}, 3000),
		[editor], // Dependency array ensures the function is not recreated on every render
	);

	useEffect(() => {
		const unsubscribe = editor.store.listen(
			() => {
				setSave("saving...");
				debouncedSave();
			},
			{ scope: "document", source: "user" },
		);

		return () => unsubscribe(); // Cleanup on unmount
	}, [editor, debouncedSave]);

	return <button>{save}</button>;
}
