import { useEffect, useRef } from "react";
import { useAiContext } from "./context";
import {motion} from "framer-motion"
import {AIOptions} from "./tapOptions";

function AiTextarea() {
  const { tab, input, setInput } = useAiContext();
  if (tab === undefined) return null;

  const textref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textref.current?.focus();
  });

  return (
    <>
      {!input[tab] && (
        <motion.h2
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute top-4 translate-x-5 opacity-80"
        >
          {AIOptions[tab]?.placeholder}
        </motion.h2>
      )}
      <textarea
        ref={textref}
        value={input[tab]}
        onChange={(e) =>
          setInput((prev) => {
            const newValues = [...prev];
            newValues[tab] = e.target.value;
            return newValues;
          })
        }
        rows={3}
        className="w-full resize-none rounded-2xl bg-[#33393D] px-4 py-2 focus:border-none focus:outline-none"
      ></textarea>
    </>
  );
}

export default AiTextarea;