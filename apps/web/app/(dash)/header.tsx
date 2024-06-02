import React from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../public/logo.svg";
import { AddIcon, ChatIcon } from "@repo/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/shadcn/tabs";

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

        <Tabs
          className="absolute flex flex-col justify-center items-center w-full -z-10 group top-0 transition-transform duration-1000 ease-out"
          defaultValue="account"
        >
          <div className="bg-secondary all-center h-11 rounded-full p-2 min-w-14">
            <button className="p-2 group-hover:hidden transition duration-500 ease-in-out">
              <Image src={AddIcon} alt="Add icon" />
            </button>

            <div className="hidden group-hover:flex inset-0 transition-opacity duration-500 ease-in-out">
              <TabsList className="p-2">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="bg-secondary all-center rounded-full p-2 mt-4 min-w-14 hidden group-hover:block">
            <TabsContent value="account">
              Make changes to your account here.
            </TabsContent>
            <TabsContent value="password">
              Change your password here.
            </TabsContent>
          </div>
        </Tabs>

        <button className="flex shrink-0 duration-200 items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-secondary">
          <Image src={ChatIcon} alt="Chat icon" />
          Start new chat
        </button>
      </div>
    </div>
  );
}

export default Header;
