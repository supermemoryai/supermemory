import { useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerOverlay } from "./ui/drawer";
import { MemoryIcon } from "@/assets/Memories";
import { cn } from "@/lib/utils";
import { MemoriesBar } from "./Sidebar/MemoriesBar";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hide?: boolean;
}

export function MemoryDrawer({ className, hide = false, ...props }: Props) {
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | null | string
  >(0.1);

  return (
    <Drawer
      snapPoints={[0.1, 0.9]}
      activeSnapPoint={activeSnapPoint}
      shouldScaleBackground={false}
      setActiveSnapPoint={setActiveSnapPoint}
      open={true}
      dismissible={false}
      modal={false}
    >
      <DrawerContent
        overlay={false}
        data-expanded={activeSnapPoint === 0.9}
        className={cn(
          "border-rgray-6 DrawerContent data-[expanded=true]:bg-rgray-3 h-full w-screen border transition-[background] focus-visible:outline-none",
          hide ? "hidden" : "",
        )}
        handle={false}
      >
        <button
          onClick={() =>
            setActiveSnapPoint((prev) => (prev === 0.9 ? 0.1 : 0.9))
          }
          className="bg-rgray-4 border-rgray-6 text-rgray-11 absolute left-1/2 top-0 flex w-fit -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-md border px-3 py-2"
        >
          <MemoryIcon className="h-7 w-7" />
          Memories
        </button>
        <div className="h-full w-full overflow-y-auto">
          <MemoriesBar isOpen={true} />
        </div>
      </DrawerContent>
      <DrawerOverlay className="relative bg-transparent" />
    </Drawer>
  );
}
