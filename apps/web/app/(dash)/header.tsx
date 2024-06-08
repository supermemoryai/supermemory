import React from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../public/logo.svg";
import { ChatIcon } from "@repo/ui/icons";

import DynamicIsland from "./dynamicisland";

function Header() {
  return (
    <div>
      <div className="absolute left-0 w-full flex items-center justify-between z-10">
        <Link className="px-5" href="/home">
          <Image
            src={Logo}
            alt="SuperMemory logo"
            className="hover:brightness-75 brightness-50 duration-200"
          />
        </Link>

        <DynamicIsland />

        <button className="flex shrink-0 duration-200 items-center gap-2 px-5 py-1.5 rounded-xl hover:bg-secondary">
          <Image src={ChatIcon} alt="Chat icon" />
          Start new chat
        </button>
      </div>
    </div>
  );
}

export default Header;
