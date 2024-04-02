import { SpaceIcon } from "@/assets/Memories";
import { Textarea2 } from "./ui/textarea";
import { ArrowRight, ChevronDown, GlobeIcon } from "lucide-react";

export default function Main() {
  return (
    <main className="flex h-screen w-full items-center justify-center px-60">
      <Textarea2
        className="h-[20vh]"
        textAreaProps={{
          placeholder: "Ask your SuperMemory...",
          className: "text-lg p-2 text-rgray-11",
        }}
      >
        <div className="text-rgray-11/70 flex w-full items-center justify-center p-2">
          <button className="text-rgray-11/70 focus-visible:ring-rgray-8 hover:bg-rgray-3 flex items-center justify-center gap-1 rounded-md px-2 py-1 ring-2 ring-transparent focus-visible:outline-none">
            <SpaceIcon className="mr-1 h-5 w-5" />
            Spaces
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="text-rgray-11/70 focus-visible:ring-rgray-8 hover:bg-rgray-3 flex items-center justify-center gap-1 rounded-md px-2 py-1 ring-2 ring-transparent focus-visible:outline-none">
            <GlobeIcon className="mr-1 h-4 w-4" />
            Pages
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 ml-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent focus-visible:outline-none">
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </Textarea2>
    </main>
  );
}
