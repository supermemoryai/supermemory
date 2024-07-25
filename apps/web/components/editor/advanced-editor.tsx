"use client";
import { defaultEditorContent } from "@/lib/content";
import {EditorContent,EditorRoot,type JSONContent,} from "novel";
import { ImageResizer } from "novel/extensions";
import { useEffect, useState } from "react";
import { defaultExtensions } from "./extensions";
import { slashCommand } from "./slash-command";
import Topbar from "./topbar";
import {Updates} from "@/lib/deboucedSave";
import { editorProps } from "@/lib/editorprops";
import EditorTools from "./editorTools";

const extensions = [...defaultExtensions, slashCommand];

const TailwindAdvancedEditor = () => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number>(0);

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);
  }, []);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-xl">
      <Topbar charsCount={charsCount} saveStatus={saveStatus} />
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          autofocus={true}  
          className="relative border-2 shadow-lg rounded-lg border-[#1F2428] mt-[20vh] w-full max-w-screen-xl bg-[#171B1F] mb-[40vh]"
          // @ts-ignore
          editorProps={editorProps}
          onUpdate={({ editor }) => {
            Updates({editor,setSaveStatus,setCharsCount});
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          < EditorTools />
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default TailwindAdvancedEditor;
