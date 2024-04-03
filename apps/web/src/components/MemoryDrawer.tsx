import { useState } from "react";
import { Drawer, DrawerContent, DrawerOverlay } from "./ui/drawer";
import { MemoryIcon } from "@/assets/Memories";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function MemoryDrawer({ className, ...props }: Props) {
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
        className="border-rgray-6 h-full w-screen border-2 pt-4 focus-visible:outline-none"
        handle={false}
      >
        <div className="bg-rgray-4 border-rgray-6 text-rgray-11 absolute left-1/2 top-0 flex w-fit -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-md border-2 px-3 py-2">
          <MemoryIcon className="h-7 w-7" />
          Memories
        </div>
        Hello
      </DrawerContent>
      <DrawerOverlay className="relative bg-transparent" />
    </Drawer>
  );
}
