"use client";

import AskAiButton from "./aicomponents/askAiButton";
import Tabs from "./aicomponents/tabcomponent";
import { AiContextProvider } from "./aicomponents/context";

export default function AiGenerate() {
  return (
      <div className="fixed bottom-0 left-0 pb-4 flex w-full select-none justify-center bg-[#171B1F] text-xl font-medium">
        <AiContextProvider>
          <Tabs />
          <AskAiButton />
        </AiContextProvider>
      </div>
  );
}
