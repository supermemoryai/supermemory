import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useAiContext } from "./context";
import AiTextarea from "./aiTextarea";
import AiShortcuts from "./aiShortcut";
import AiEnterCommand from "./aiEnter";

function AiInput() {
  const { tab } = useAiContext();

  useEffect(() => {
    const down = async (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (tab === undefined) return null;

  return (
    <motion.div
      initial={{ y: "-90%" }}
      animate={{ y: "-110%" }}
      className="absolute w-full rounded-3xl bg-[#1F2428] text-[#989EA4]"
    >
      <div className="flex w-full flex-col px-2 py-2">
        <AiTextarea />
        <div className="pointer-events-none absolute bottom-3 left-0 flex w-full justify-between px-7">
          <AiShortcuts />
          <AiEnterCommand />
        </div>
      </div>
    </motion.div>
  );
}

export default AiInput;


// async function AigenerateContent({request, editor}:{request: string, editor: Editor}) {

//   const resp = await fetch("/api/editorai", {
//     method: "POST",
//     body: JSON.stringify({
//       context: cont, request
//     }),
//   });
//   const { from, to } = editor.view.state.selection;

//   const reader = resp.body?.getReader();
//   let done = false;
//   let position = from
//   editor.chain().focus().deleteSelection().run()
//   while (!done && reader) {
//     const { value, done: d } = await reader.read();
//     done = d;
//     const text = new TextDecoder().decode(value)
//     editor.chain().focus().insertContentAt(position, text).run();
//     position += text.length;
//   } 
// }