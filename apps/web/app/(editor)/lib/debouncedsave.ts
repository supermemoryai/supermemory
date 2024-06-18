import hljs from 'highlight.js'
import { debounce } from 'tldraw';
import { useDebouncedCallback } from "use-debounce";

export const Updates = debounce(({editor, setCharsCount, setSaveStatus})=> {
  const json = editor.getJSON();
  setCharsCount(editor.storage.characterCount.words());
  window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
  window.localStorage.setItem("novel-content", JSON.stringify(json));
  window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
  setSaveStatus("Saved");
}, 500)

export const highlightCodeblocks = (content: string) => {
  const doc = new DOMParser().parseFromString(content, 'text/html');
  doc.querySelectorAll('pre code').forEach((el) => {
    hljs.highlightElement(el);
  });
  return new XMLSerializer().serializeToString(doc);
};