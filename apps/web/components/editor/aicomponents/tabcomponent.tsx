import { AnimatePresence, motion } from "framer-motion";
import { useAiContext } from "./context";
import AiInput from "./aiInput";
import { useEffect } from "react";
import { tabs } from "./tapOptions";
import { variants } from "./framerVariants";
import { TabButton } from "./tabButton";

export default function Tabs() {
  const { aiOpen, tab, setTab } = useAiContext();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key) && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setTab(parseInt(e.key)-1)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <AnimatePresence mode="popLayout">
      {aiOpen && (
        <motion.div
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, exit: { duration: 0.05 } }}
          className="absolute flex rounded-3xl bg-[#1F2428] px-1 py-1 text-lg text-[#989EA4]"
        >
          <AiInput />
          {tabs.map((itab, i) => <TabButton itab={itab} i={i} tab={tab} />)}
          <div className="absolute bottom-0 bg-blue-700 blur-[250px] h-5 w-full"/>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
