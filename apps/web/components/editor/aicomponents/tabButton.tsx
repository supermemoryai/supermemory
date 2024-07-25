import Image from "next/image";
import { useAiContext } from "./context";
import {motion} from "framer-motion"

export function TabButton({itab, i, tab}){
  const { setResponse,setTab } = useAiContext();
  return (
    <button
    onClick={() => {
      setTab(i);
      setResponse("");
    }}
    className="relative flex items-center gap-2 px-5 py-1"
  >
    <Image
      className="relative z-10"
      src={itab.icon}
      alt={itab.name}
    />
    <h2 className="relative z-10 whitespace-nowrap">{itab.name} <sup>{itab.shortcut}</sup></h2>
    {i === tab && (
      <motion.div
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.1,
          layout: { type: "spring", duration: 0.4 },
        }}
        layoutId="bg"
        className="absolute left-0 h-full w-full rounded-3xl bg-[#33393D]"
      />
    )}
  </button>
  )
}