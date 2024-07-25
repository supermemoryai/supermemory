import React, { useEffect, useState } from 'react'
import Magic from './ui/icons/magic'
import CrazySpinner from './ui/icons/crazy-spinner'
import Asksvg from './ui/icons/asksvg'
import Rewritesvg from './ui/icons/rewritesvg'
import Translatesvg from './ui/icons/translatesvg'
import Autocompletesvg from './ui/icons/autocompletesvg'
import { motion, AnimatePresence } from "framer-motion"
import { useCurrentEditor } from "@tiptap/react";
import type { Editor } from '@tiptap/core'


function Aigenerate() {
  const [visible, setVisible] = useState(false)
  const [generating, setGenerating] = useState(false)

  const { editor } = useCurrentEditor();
  if (!editor) return null;

  useEffect(()=> {
    !visible && setGenerating(visible)
  }, [visible])

  const setGeneratingfn = (v: boolean) => setGenerating(v)

  return (
  <div  className="z-[60] bg-[#171B1F] fixed left-0 bottom-0 w-screen flex justify-center pt-4 pb-6">
    <motion.div
      animate={{
        y: visible ? "30%" : 0,
      }}
      transition={{
        ease: [.19, 1, .22, 1]
      }}
     onClick={()=> {
      setVisible(!visible);
     }}
     className={`select-none relative z-[70] rounded-3xl text-[#369DFD] bg-[#21303D] px-4 py-3 text-sm flex gap-2 items-center font-medium whitespace-nowrap overflow-hidden transition-[width] w-[6.26rem] ${visible && "w-[10.76rem]"} ease-[cubic-bezier(.25,.46,.45,.94)]`}>
      <Magic className="h-4 w-4 shrink-0 translate-y-[5%]" />
      {
        (visible && generating) ? (
          <>Generating <CrazySpinner /></>
        ) : visible ? (
          <>Press Commands</>
        ) : (
          <>Ask AI</>
        )
      }
    </motion.div>
    <motion.div 
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        y: visible ? "-60%" : 20,
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : .9,
      }}
      whileHover={{ scale: 1.05 }}
      transition={{
        duration: 0.2,
        ease: [.215, .61, .355, 1]
      }}
    className='absolute z-50 top-0'>
      <ToolBar setGeneratingfn={setGeneratingfn} editor={editor} />
      <div className="h-8 w-18rem bg-blue-600 blur-[16rem]" />
    </motion.div>
  </div>
  )
}

export default Aigenerate

const options = [
  <><Translatesvg />Translate</>,
  <><Rewritesvg />Change Tone</>,
  <><Asksvg />Ask Gemini</>,
  <><Autocompletesvg />Auto Complete</>
];

function ToolBar({editor, setGeneratingfn}: {editor:Editor, setGeneratingfn:  (v: boolean) => void}) {
  const [index, setIndex] = useState(0);

  return (
    <div className={"flex gap-6 bg-[#1F2428] active:scale-[.98] transition rounded-3xl px-1 py-1 text-sm font-medium"}>
      {options.map((item, idx) => (
        <div
          key={idx}
          className="relative block h-full w-full px-3 py-2 text-[#989EA4]"
          onMouseEnter={() => setIndex(idx)}
        >
          <AnimatePresence>
            {index === idx && (
              <motion.span
                onClick={()=> AigenerateContent({idx, editor,setGeneratingfn })}
                className="absolute select-none inset-0 block h-full w-full rounded-xl bg-[#33393D]"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <div className="select-none flex items-center whitespace-nowrap gap-3 relative z-[60] pointer-events-none">
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

const requests = [
  "Translate to marathi, do not write anything else",
  "change tone, improve the way be more formal",
  "ask, answer the question",
  "continue this, minimum 80 characters, do not repeat just continue. Don't use ... to denote start",
];

async function AigenerateContent({
  idx,
  editor,
  setGeneratingfn,
}: {
  idx: number;
  editor: Editor;
  setGeneratingfn: (v: boolean) => void;
}) {
  setGeneratingfn(true);

  const request = requests[idx];

  const cont = getWholeNode(editor)

//   editor.chain().focus().insertContent("newContent", {
//     parseOptions: {
//       preserveWhitespace: 'full',
//     },
//     updateSelection: false, // Prevent moving the cursor
//   }).setSelection({
//     from,
//     to: from + newContent.length, // Adjust the selection range
//   }).run();
// };

  // const conte = ContentModifying(editor)

  const resp = await fetch("/api/editorai", {
    method: "POST",
    body: JSON.stringify({
      context: cont, request
    }),
  });
  const { from, to } = editor.view.state.selection;

  const reader = resp.body?.getReader();
  let done = false;
  let position = from
  while (!done && reader) {
    const { value, done: d } = await reader.read();
    done = d;
    const text = new TextDecoder().decode(value)
    const tr =  editor.view.state.tr
    // editor.state.selection.replaceWith(tr,)
    editor.chain().focus().insertContentAt(position, text).run();
    position += text.length;
  } 
  // editor.chain().focus().insertContentAt(position, `<h1>hel.com</h1>`).run();

  setGeneratingfn(false);
}

function ContentFlowing(editor: Editor){
  let context = getSelectionString(editor)
  if (context.length < 9){
    context = getPastContent(editor)
    if (context.length < 12){
      context = getWholeNode(editor)
      if (context.length < 12){
        return getLastNode(editor) + " " + context
      } 
    }
  }
  return context
}

function ContentModifying(editor: Editor){
  let context = getSelectionString(editor)
  if (context.length < 8){
      context = getWholeNode(editor)
      if (context.length < 12){
        return getLastNode(editor) + " " + context
      }
    }
  return context
}


function getPastContent(editor: Editor){
  const { from, to } = editor.view.state.selection;
  const effe = editor.$pos(to)
  // editor.commands.selectParentNode(); 
  return effe.textContent.substring(0, (to-effe.from))
}

function getWholeNode(editor: Editor){
  const { from, to } = editor.view.state.selection;
  const effe = editor.$pos(to)
  editor.commands.selectParentNode();  
  return effe.textContent
}

function getLastNode(editor: Editor){
  const { from, to } = editor.view.state.selection;
  const effe = editor.$pos(to)
  editor.commands.selectNodeBackward();  
  return effe.textContent
}

function getSelectionString(editor: Editor):string{
  const { from, to } = editor.view.state.selection;
  const slice = editor.state.selection.content();
  return editor.storage.markdown.serializer.serialize(slice.content);
}