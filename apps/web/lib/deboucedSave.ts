import highlightCodeblocks from "./highlightCode";
import {debounce} from 'tldraw';

export const Updates = debounce(({editor, setCharsCount, setSaveStatus})=> {
  const json = editor.getJSON();
  setCharsCount(editor.storage.characterCount.words());
  window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
  window.localStorage.setItem("novel-content", JSON.stringify(json));
  window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
  setSaveStatus("Saved");
}, 500)