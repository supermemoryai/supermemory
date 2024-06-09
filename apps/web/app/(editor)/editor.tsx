"use client";
import { defaultEditorContent } from "./lib/content";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  type JSONContent,
  EditorBubble,
} from "novel";
import { ImageResizer, handleCommandNavigation } from "novel/extensions";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./components/extensions";
import { ColorSelector } from "./components/selectors/color-selector";
import { LinkSelector } from "./components/selectors/link-selector";
import { NodeSelector } from "./components/selectors/node-selector";
import { Separator } from "./components/tailwind/ui/separator";
import { TextButtons } from "./components/selectors/text-buttons";
import { BgColorSelector } from "./components/selectors/bgcolor-selector";

import { handleImageDrop, handleImagePaste } from "novel/plugins";
import { uploadFn } from "./components/image-upload";
import { slashCommand, suggestionItems } from "./components/slash-command";
import Aigenerate from "./components/aigenerate";

const hljs = require('highlight.js');

const extensions = [...defaultExtensions, slashCommand];

const TailwindAdvancedEditor = () => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openBgColor, setOpenBgColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
    setSaveStatus("Saved");
  }, 500);

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);
  }, []);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-xl">
      <div className="fixed left-0 top-0 z-10 w-screen flex bg-[#171B1F] justify-center items-center pt-6 pb-4">
        <div className="rounded-lg bg-[#21303D] px-2 py-1 text-sm text-muted-foreground">Untitled - {saveStatus}</div>
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}   
          className="relative min-h-[55vh] mt-[20vh] w-full max-w-screen-xl bg-[#171B1F] mb-[40vh]"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
            
          }}
          slotAfter={<ImageResizer />}
        >
          <Aigenerate />
          <EditorCommand className="z-50 h-auto max-h-[330px] min-w-[20rem] overflow-y-auto rounded-3xl bg-[#1F2428]  shadow-md transition-all">
            <EditorCommandEmpty className="px-4 text-lg text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command(val)}
                  className="flex w-full items-center space-x-4 rounded-md px-4 py-3 text-left text-sm hover:bg-accent aria-selected:bg-[#21303D] group/command"
                  key={item.title}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#2D343A] group-aria-selected/command:bg-[#369DFD33] stroke-[#989EA4] group-aria-selected/command:stroke-[#369DFD]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-[#FFFFFF] group-aria-selected/command:text-[#369DFD]">{item.title}</p>
                    <p className="text-xs text-muted-foreground group-aria-selected/command:text-[#369DFDB2]">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
          <EditorBubble
            tippyOptions={{
              placement: openAI ? "bottom-start" : "top",
            }}
            className='flex w-fit max-w-[90vw] overflow-hidden bg-[#1F2428] text-white rounded '>
              <Separator orientation="vertical" />
              <NodeSelector open={openNode} onOpenChange={setOpenNode} />
              <Separator orientation="vertical" />
              <LinkSelector open={openLink} onOpenChange={setOpenLink} />
              <Separator orientation="vertical" />
              <TextButtons />
              <Separator orientation="vertical" />
              <ColorSelector open={openColor} onOpenChange={setOpenColor} />
              <Separator orientation="vertical" />
              <BgColorSelector open={openBgColor} onOpenChange={setOpenBgColor} />
              </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default TailwindAdvancedEditor;
