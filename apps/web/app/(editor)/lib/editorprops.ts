import { handleCommandNavigation } from "novel/extensions";
import { handleImageDrop, handleImagePaste } from "novel/plugins";
import { uploadFn } from "../components/image-upload";
import { EditorView } from "prosemirror-view";

export const editorProps = {
  handleDOMEvents: {
    keydown: (_view: EditorView, event: KeyboardEvent) => handleCommandNavigation(event),
  },
  handlePaste: (view: EditorView, event: ClipboardEvent) => handleImagePaste(view, event, uploadFn),
  handleDrop: (view: EditorView, event: DragEvent, slice, moved:boolean) => handleImageDrop(view, event, moved, uploadFn),
  attributes: {
    class:
      "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
  },
}