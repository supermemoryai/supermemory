import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Plate } from "@udecode/plate-common/react";
import { useCreateEditor } from "~/components/editor/use-create-editor";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";

export function PlateEditor() {
	const editor = useCreateEditor();

	return (
		<DndProvider backend={HTML5Backend}>
			<Plate editor={editor}>
				<EditorContainer className="w-full border z-[99999]">
					<Editor  variant="default" />
				</EditorContainer>
			</Plate>
		</DndProvider>
	);
}
