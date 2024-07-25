import hljs from 'highlight.js';

export default function highlightCodeblocks(content: string){
  const doc = new DOMParser().parseFromString(content, 'text/html');
  doc.querySelectorAll('pre code').forEach((el) => {
    hljs.highlightElement(el as HTMLElement);
  });
  return new XMLSerializer().serializeToString(doc);
};