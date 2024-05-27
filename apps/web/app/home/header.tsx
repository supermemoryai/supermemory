import React from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../public/logo.svg";
import { AddIcon, ChatIcon } from "@repo/ui/icons";

function Header() {
  return (
    <div>
      <div className="flex items-center justify-between relative z-10">
        <Link href="/">
          <Image
            src={Logo}
            alt="SuperMemory logo"
            className="hover:brightness-125 duration-200"
          />
        </Link>

        <div className="absolute flex justify-center w-full -z-10">
          <button className="bg-secondary all-center h-11 rounded-full p-2 min-w-14">
            <Image src={AddIcon} alt="Add icon" />
          </button>
        </div>

        <button className="flex shrink-0 duration-200 items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-secondary">
          <Image src={ChatIcon} alt="Chat icon" />
          Start new chat
        </button>
      </div>
    </div>
  );
}

export default Header;
