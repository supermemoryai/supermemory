import { useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerOverlay,
  DrawerTrigger,
} from "./ui/drawer";
import { cn } from "@/lib/utils";
import { SettingsTab } from "./Sidebar/SettingsTab";
import { useSession } from "next-auth/react";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hide?: boolean;
}

export function ProfileDrawer({ className, hide = false, ...props }: Props) {
  const { data: session } = useSession();

  return (
    <Drawer snapPoints={[0.9]} shouldScaleBackground={false}>
      <DrawerTrigger>
        <img
          src={session?.user?.image ?? "/icons/white_without_bg.png"}
          className="h-10 w-10 rounded-full"
        />
      </DrawerTrigger>
      <DrawerContent
        overlay={false}
        className={cn(
          "border-rgray-6 DrawerContent data-[expanded=true]:bg-rgray-3 z-[101] h-full w-screen border bg-white transition-[background] focus-visible:outline-none",
          hide ? "hidden" : "",
        )}
      >
        <div className="h-[85vh] w-full overflow-y-auto">
          <SettingsTab open={true} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
