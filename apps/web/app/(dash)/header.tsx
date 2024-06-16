import React from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../public/logo.svg";
import { AddIcon, ChatIcon } from "@repo/ui/icons";

import DynamicIsland from "./dynamicisland";

function Header() {
  return (
    <div className="p-4 relative z-10 h-16 flex items-center">

      <div className="w-full flex items-center justify-between">
        <Link className="" href="/home">
          <Image
            src={Logo}
            alt="SuperMemory logo"
            className="hover:brightness-125 duration-200"
          />
        </Link>

        <div className="fixed z-30 left-1/2 -translate-x-1/2 top-5">
          {/* <DynamicIsland /> */}
          <button className="bg-secondary p-2 text-[#989EA4] rounded-full flex items-center justify-between gap-2 px-4 h-10 pr-5">
            <Image 
              src={AddIcon}
              alt="add icon"
            />
            Add content
          </button>
        </div>

        <button className="flex duration-200 items-center text-[#7D8994] hover:bg-[#1F2429] text-[13px] gap-2 px-3 py-2 rounded-xl">
          <Image src={ChatIcon} alt="Chat icon" className="w-5" />
          Start new chat
        </button>
      </div>

    </div>
  );
}

export default Header;
