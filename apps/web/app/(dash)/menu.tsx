import React from "react";
import Image from "next/image";
import { MemoriesIcon, ExploreIcon, HistoryIcon } from "@repo/ui/icons";

function Menu() {
  const menuItems = [
    {
      icon: MemoriesIcon,
      text: "Memories",
      url: "/",
    },
    {
      icon: ExploreIcon,
      text: "Explore",
      url: "/explore",
    },
    {
      icon: HistoryIcon,
      text: "History",
      url: "/history",
    },
  ];

  return (
    <div className="absolute h-full p-4 flex items-center top-0 left-0">
      <div className="">
        <div className="hover:rounded-2x group inline-flex w-14 text-foreground-menu text-[15px] font-medium flex-col items-start gap-6 overflow-hidden rounded-[28px] bg-secondary px-3 py-4 duration-200 hover:w-40">
          {menuItems.map((item) => (
            <div
              key={item.url}
              className="flex w-full cursor-pointer items-center gap-3 px-1 duration-200 hover:scale-105 hover:brightness-150 active:scale-90"
            >
              <Image
                src={item.icon}
                alt={`${item.text} icon`}
                className="hover:brightness-125 duration-200"
              />
              <p className="opacity-0 duration-200 group-hover:opacity-100">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Menu;
