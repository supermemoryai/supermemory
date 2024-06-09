import React, { useEffect, useState } from 'react'
import Magic from './tailwind/ui/icons/magic'
import CrazySpinner from './tailwind/ui/icons/crazy-spinner'
import Asksvg from './tailwind/ui/icons/asksvg'
import Rewritesvg from './tailwind/ui/icons/rewritesvg'
import Translatesvg from './tailwind/ui/icons/translatesvg'
import Autocompletesvg from './tailwind/ui/icons/autocompletesvg'
import { motion, AnimatePresence } from "framer-motion"
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Editor } from '@tiptap/core'
import { removeAIHighlight } from 'novel/extensions'
import { useEditor } from 'novel'


function Aigenerate() {
  const [visible, setVisible] = useState(false)
  const [generating, setGenerating] = useState(false)

  const { editor } = useEditor();

  useEffect(()=> {
    if (!visible) {
      setGenerating(visible)
    } else{
      removeAIHighlight(editor);
      editor.chain().unsetHighlight().run();
    }

  }, [visible])

  const setGeneratingfn = (v: boolean) => setGenerating(v)

  return (
  <div  className="z-[60] bg-[#171B1F] fixed left-0 bottom-0 w-screen flex justify-center py-4">
    <motion.div
      animate={{
        y: visible ? "30%" : 0,
      }}
     onClick={()=> {
      setVisible(!visible);
     }}
     className={`select-none relative z-[70] rounded-3xl text-[#369DFD] bg-[#21303D] px-4 py-3 text-sm flex gap-2 items-center font-medium whitespace-nowrap overflow-hidden transition-[width] w-[6.25rem] ${visible && "w-[10.56rem]"}`}>
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
      }}
      whileHover={{ scale: 1.05 }}
      transition={{
        duration: 0.2,
      }}
    className='absolute z-50 top-0'>
      <ToolBar setGeneratingfn={setGeneratingfn} editor={editor} />
    </motion.div>
  </div>
  )
}

export default Aigenerate

const options = [
  <div  className='flex items-center whitespace-nowrap gap-3 relative z-[60] pointer-events-none'><Translatesvg />Translate</div>,
  <div  className='flex items-center whitespace-nowrap gap-3 relative z-[60] pointer-events-none'><Rewritesvg />Change Tone</div>,
  <div  className='flex items-center whitespace-nowrap gap-3 relative z-[60] pointer-events-none'><Asksvg />Ask Gemini</div>,
  <div  className='flex items-center whitespace-nowrap gap-3 relative z-[60] pointer-events-none'><Autocompletesvg />Auto Complete</div>
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
                className="absolute inset-0 block h-full w-full rounded-xl bg-[#33393D]"
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
          {item}
        </div>
      ))}
    </div>
  );
}

async function AigenerateContent({idx, editor, setGeneratingfn}:{idx:number, editor:Editor, setGeneratingfn: (v:boolean) => void}){
    setGeneratingfn(true);
    const from = editor.view.state.selection.from
    const to = editor.view.state.selection.to
    editor.chain().setTextSelection({from, to}).run();
    editor.commands.setAIHighlight({color: "#0538A2"})
    const query = editor.state.doc.textBetween(from, to, " $$$ ")
    console.log("hello there!", from, to)
    setGeneratingfn(false);

    // const genAI = new GoogleGenerativeAI("AIzaSyDGwJCP9SH5gryyvh65LJ6xTZ0SOdNvzyY");
    // const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    

    // const result = (await model.generateContent(`${ty}, ${query}`)).response.text();

    // .insertContentAt(
    //   {
    //     from: from,
    //     to: to,
    //   },
    //   result,
    // )
    // .run();
}
