"use server";
import { StoredContent } from "@/server/db/schema";
import { AddNewPagePopover, PageItem } from "./PagesItem";
import { CategoryItem } from "./CategoryItem";
import { MemoryIcon } from "../../assets/Memories";
import { Trash2, User2 } from "lucide-react";

export default async function Sidebar() {
  const pages: StoredContent[] = [
    {
      id: 1,
      content: "",
      title: "Visual Studio Code",
      url: "https://code.visualstudio.com",
      description: "",
      image: "https://code.visualstudio.com/favicon.ico",
      baseUrl: "https://code.visualstudio.com",
      savedAt: new Date(),
    },
    {
      id: 2,
      content: "",
      title: "yxshv/vscode: An unofficial remake of vscode's landing page",
      url: "https://github.com/yxshv/vscode",
      description: "",
      image: "https://github.com/favicon.ico",
      baseUrl: "https://github.com",
      savedAt: new Date(),
    },
  ];

  return (
    <aside className="bg-rgray-2 border-rgray-6 flex h-screen w-max flex-col items-center border-r px-2 py-5 text-sm font-light">
      <button
        // data-state-on="true"
        className="on:opacity-100 on:bg-rgray-4 focus-visible:ring-rgray-7 flex w-full flex-col items-center justify-center rounded-md px-3 py-3 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <MemoryIcon className="h-10 w-10" />
        <span className="">Memories</span>
      </button>
      <button
        // data-state-on="true"
        className="on:opacity-100 on:bg-rgray-3 focus-visible:ring-rgray-7 mt-auto flex w-full flex-col items-center justify-center gap-1 rounded-md px-3 py-3 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <Trash2 strokeWidth={1.3} className="h-6 w-6" />
        <span className="">Trash</span>
      </button>
      <button
        // data-state-on="true"
        className="on:opacity-100 on:bg-rgray-3 focus-visible:ring-rgray-7 flex w-full flex-col items-center justify-center gap-1 rounded-md px-3 py-4 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <User2 strokeWidth={1.3} className="h-6 w-6" />
        <span className="">Profile</span>
      </button>
    </aside>
  );
}

export async function SubSidebar() {
  const pages: StoredContent[] = [
    {
      id: 1,
      content: "",
      title: "Visual Studio Code",
      url: "https://code.visualstudio.com",
      description: "",
      image: "https://code.visualstudio.com/favicon.ico",
      baseUrl: "https://code.visualstudio.com",
      savedAt: new Date(),
    },
    {
      id: 2,
      content: "",
      title: "yxshv/vscode: An unofficial remake of vscode's landing page",
      url: "https://github.com/yxshv/vscode",
      description: "",
      image: "https://github.com/favicon.ico",
      baseUrl: "https://github.com",
      savedAt: new Date(),
    },
  ];

  return (
    <aside className="bg-rgray-2 border-rgray-6 flex h-screen w-[20vw] flex-col items-center border-r px-3 py-5 font-light">
      <button
        // data-state-on="true"
        className="on:opacity-100 on:bg-rgray-3 focus-visible:ring-rgray-7 flex w-full flex-col items-center justify-center rounded-md px-4 py-3 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <MemoryIcon className="h-10 w-10" />
        <span className="">Memories</span>
      </button>
      <button
        data-state-on="true"
        className="on:opacity-100 focus-visible:ring-rgray-7 mt-auto flex w-full flex-col items-center justify-center gap-1 rounded-md bg-black p-4 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <Trash2 strokeWidth={1.3} className="h-6 w-6" />
        <span className="">Trash</span>
      </button>
      <button
        // data-state-on="true"
        className="on:opacity-100 on:bg-rgray-3 focus-visible:ring-rgray-7 flex w-full flex-col items-center justify-center gap-1 rounded-md p-3 px-4 py-4 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <User2 strokeWidth={1.3} className="h-6 w-6" />
        <span className="">Profile</span>
      </button>
    </aside>
  );
}
