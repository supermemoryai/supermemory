import type { Editor } from "@tiptap/react";

// check if there is anything after cursor, to know if we want to use this getContentBeforeCursor or getWholeNode

// check if current node contains anything or we should go back to last node to get content

// for autocomplete and ask ai, the technique is get content from selection, if none, go for whole node, if none go for last node all while making sure that the content does not exceed 200 words limit.

// for change length & improve, select the content to modify or it uses the current node. 
export function getContentBeforeCursor(editor: Editor){
  const { to } = editor.view.state.selection;
  const effe = editor.$pos(to)
  return effe.textContent.substring(0, (to-effe.from))
}

/**
 * use 
 * `editor.commands.selectParentNode();  ` 
 *  to highlight
 */
export function getWholeNode(editor: Editor){
  const { to } = editor.view.state.selection;
  const Node = editor.$pos(to)
  return Node.textContent
}

/**
 * use 
 * `editor.commands.selectNodeBackward()` 
 *  to highlight
 */
export function getLastNode(editor: Editor){
  const {  to } = editor.view.state.selection;
  const effe = editor.$pos(to)
  return effe.textContent;
}

export function getSelection(editor: Editor):string{
  const slice = editor.state.selection.content();
  return editor.storage.markdown.serializer.serialize(slice.content);
}