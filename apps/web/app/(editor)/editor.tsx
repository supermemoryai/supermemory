"use client";
import { defaultEditorContent } from "./lib/content";
import { EditorContent, EditorRoot, type JSONContent } from "novel";
import { ImageResizer } from "novel/extensions";
import { useEffect, useState } from "react";
import { defaultExtensions } from "./components/extensions";

import { slashCommand } from "./components/slash-command";
import { Updates } from "./lib/debouncedsave";
import { editorProps } from "./lib/editorprops";
import EditorCommands from "./components/editorcommands";
import Aigenerate from "./components/aigenerate";
import { useMotionValueEvent, useScroll } from "framer-motion";
import Topbar from "./components/topbar";

const Editor = () => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(
    null,
  );
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);
  }, []);

  if (!initialContent) return <>Loading...</>;

  return (
    <div className="relative w-full max-w-screen-xl">
      <Topbar charsCount={charsCount} saveStatus={saveStatus} />
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={[...defaultExtensions, slashCommand]}
          className="min-h-[55vh] mt-[8vh] w-full max-w-screen-xl bg-[#171B1F] mb-[40vh]"
          editorProps={editorProps}
          onUpdate={({ editor }) => {
            Updates({ editor, setCharsCount, setSaveStatus });
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommands />
          <Aigenerate />
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default Editor;
