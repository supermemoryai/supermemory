"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MemoriesIcon, ExploreIcon, CanvasIcon } from "@repo/ui/icons";

function Menu() {
  const menuItems = [
    {
      icon: MemoriesIcon,
      text: "Memories",
      url: "/memories",
      disabled: false,
    },
    {
      icon: ExploreIcon,
      text: "Explore",
      url: "/explore",
      disabled: true,
    },
    {
      icon: CanvasIcon,
      text: "Canvas",
      url: "/canvas",
      disabled: true,
    },
  ];

  return (
    <>
      {/* Desktop Menu */}
      <div className="hidden lg:flex fixed h-screen pb-20 w-full p-4 items-center justify-start top-0 left-0 pointer-events-none">
        <div className="pointer-events-auto group flex w-14 text-foreground-menu text-[15px] font-medium flex-col items-start gap-6 overflow-hidden rounded-[28px] bg-secondary px-3 py-4 duration-200 hover:w-40">
          {menuItems.map((item) => (
            <Link
              aria-disabled={item.disabled}
              href={item.disabled ? "#" : item.url}
              key={item.url}
              className={`flex w-full ${
                item.disabled
                  ? "cursor-not-allowed opacity-50"
                  : "text-[#777E87] brightness-75 hover:brightness-125 cursor-pointer"
              } items-center gap-3 px-1 duration-200 hover:scale-105 active:scale-90 justify-start`}
            >
              <Image
                src={item.icon}
                alt={`${item.text} icon`}
                width={24}
                height={24}
                className="hover:brightness-125 duration-200"
              />
              <p className="opacity-0 duration-200 group-hover:opacity-100">
                {item.text}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 bg-secondary">
        <div className="flex justify-around items-center">
          {menuItems.map((item) => (
            <Link
              aria-disabled={item.disabled}
              href={item.disabled ? "#" : item.url}
              key={item.url}
              className={`flex flex-col items-center ${
                item.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <Image
                src={item.icon}
                alt={`${item.text} icon`}
                width={24}
                height={24}
              />
              <p className="text-xs text-foreground-menu mt-2">{item.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default Menu;
