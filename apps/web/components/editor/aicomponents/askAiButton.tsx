import Image from "next/image";
import { MagicIcon } from "./_svg/svg";
import { CrazySpinner } from "./svg";
import { motion } from "framer-motion";
import { useAiContext } from "./context";
import { useEffect } from "react";
import { useCurrentEditor } from "@tiptap/react";

const widthChart = {
  "Ask AI": "w-[8rem]",
  "Select Commands": "w-[14.4rem]",
  Generating: "w-[13.4rem]",
};

const Position = {
  "Ask AI": -30,
  "Select Commands": 0,
  Generating: -20,
};

export default function AskAiButton() {
  const { setAiOpen, setTab, stateG, setStateG, aiOpen } = useAiContext();
  const {editor} = useCurrentEditor();
  if (!editor) return null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "g" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleAI();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeAI()
      }
    };
    editor.on("focus", closeAI);

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down); 
    editor.off('focus', closeAI)};
  }, []);

  function closeAI(){
    setAiOpen(false);
    setTab(undefined);
    setStateG("Ask AI");
    editor.chain().focus().run(); 
  }

  function toggleAI() {
    setAiOpen((prev) => {
      setStateG(!prev ? "Select Commands": "Ask AI");
      return !prev;
    });
    setTab(undefined);
  }
  return (

    <motion.button
      animate={{ y: Position[stateG] }}
      onClick={()=> {toggleAI()}}
      className={` whitespace-nowrap rounded-[1.8rem] bg-[#21303D]  ${widthChart[stateG]} transition-[width]`}
    >
      <motion.div
        className="flex items-center gap-2 px-5 py-2 text-[#369DFD]"
        transition={{ duration: 0.5 }}
        initial={{ filter: "blur(2px)", x: 3 }}
        animate={{ filter: "blur(0px)", x: 0 }}
        key={stateG}
      >
        <Image src={MagicIcon} alt="ask-ai" />
        <h3>{stateG}</h3>
        {stateG === "Generating" && <CrazySpinner />}
        <div className={`absolute -top-1 -right-2 text-[#369dfd83] ${ aiOpen ?"text-base": "text-sm" } z-10 flex items-center`}>⌘g</div>
      </motion.div>
    </motion.button>
  );
}
