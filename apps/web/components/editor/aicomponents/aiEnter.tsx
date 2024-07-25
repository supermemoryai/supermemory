import { FiCommand } from "react-icons/fi";
import { useAiContext } from "./context";
import {motion} from "framer-motion";
import { RiCornerDownLeftFill } from "react-icons/ri";

function AiEnterCommand() {
  const { tab, input, setAiOpen, setStateG, setInput } = useAiContext();
  if (tab === undefined) return null;

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: input[tab] ? 1 : 0 }}
      transition={{ duration: 0.1 }}
      // onClick={callAI}
      className={`${input[tab] && "pointer-events-auto"} flex items-center gap-1 whitespace-nowrap rounded-md bg-[#2a2f32] px-2 py-1 text-[#d8e3ed]`}
    >
      Enter
      <div className="flex">
        <FiCommand />
        <RiCornerDownLeftFill />
      </div>
    </motion.button>
  );
}

export default AiEnterCommand;