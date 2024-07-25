import { useCurrentEditor } from "@tiptap/react";
import { useAiContext } from "./context";
import { motion } from "framer-motion";
import {AIOptions} from "./tapOptions";

function AiShortcuts() {
  const { tab, response, input } =
  useAiContext();

  const {editor} = useCurrentEditor()

  if (tab === undefined) return null;
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(1px)" }}
      animate={{
        opacity: !input[tab] ? 1 : 0,
        filter: !input[tab] ? "blur(0px)" : "blur(1px)",
      }}
      key={tab}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${!input[tab] && "pointer-events-auto"}`}
    >
      {response.length
        ? <><input />{
          AIOptions[tab]?.afterComplete?.map((v, i) => (
            <button 
            // onClick={()=> AigenerateContent({request:v.name, editor })} 
            className="flex items-center gap-2 whitespace-nowrap text-[#989EA4] hover:text-[#26D987]">
              {v.icon}
              {v.name}
            </button>
          ))
        }</>
        : AIOptions[tab]?.beforeComplete?.map((v, i) => (
            <button className="flex items-center gap-2 whitespace-nowrap  text-[#989EA4] hover:text-[#26D987]">
              {v.icon}
              {v.name}
            </button>
          ))}
    </motion.div>
  );
}

export default AiShortcuts;