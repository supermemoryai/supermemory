
import { useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerOverlay, DrawerTrigger } from "./ui/drawer";
import { cn } from "@/lib/utils";
import { ProfileTab } from "./Sidebar";
import { useSession } from "next-auth/react";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hide?: boolean;
}

export function ProfileDrawer({ className, hide = false, ...props }: Props) {

	const { data: session } = useSession();
	
  return (
    <Drawer
			snapPoints={[0.9]}
      shouldScaleBackground={false}
    >
			<DrawerTrigger>
				<img src={session?.user?.image ?? "/icons/white_without_bg.png"} className="w-10 h-10 rounded-full" />
			</DrawerTrigger>
      <DrawerContent
        overlay={false}
        className={cn(
          "border-rgray-6 z-[101] bg-rgray-3 DrawerContent data-[expanded=true]:bg-rgray-3 h-full w-screen border transition-[background] focus-visible:outline-none",
          hide ? "hidden" : "",
        )}
      >
				<div className="w-full h-[85vh] overflow-y-auto">
					<ProfileTab open={true} />
				</div>
      </DrawerContent>
    </Drawer>
  );
}
