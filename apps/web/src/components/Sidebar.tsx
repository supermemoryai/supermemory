"use client";
import { StoredContent } from "@/server/db/schema";
import {
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  Edit3,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { useState, useEffect, useRef } from "react";

export default function Sidebar() {
  const websites: StoredContent[] = [
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
      id: 1,
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
    <aside className="bg-rgray-3 flex h-screen w-[25%] flex-col items-start justify-between py-5 pb-[50vh] font-light">
      <div className="flex items-center justify-center gap-1 px-5 text-xl font-normal">
        <img src="/brain.png" alt="logo" className="h-10 w-10" />
        SuperMemory
      </div>
      <div className="flex w-full flex-col items-start justify-center p-2">
        <h1 className="mb-1 flex w-full items-center justify-center px-3 font-normal">
          Websites
          <button className="ml-auto ">
            <Plus className="h-4 w-4 min-w-4" />
          </button>
        </h1>
        {websites.map((item) => (
          <ListItem key={item.id} item={item} />
        ))}
      </div>
    </aside>
  );
}

export const ListItem: React.FC<{ item: StoredContent }> = ({ item }) => {
  const [isEditing, setIsEditing] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 500);
    }
  }, [isEditing]);

  return (
    <div className="hover:bg-rgray-5 focus-within:bg-rgray-5 flex w-full items-center rounded-full py-1 pl-3 pr-2 transition  [&:hover>a>[data-upright-icon]]:block [&:hover>a>img]:hidden [&:hover>button]:opacity-100">
      <a
        href={item.url}
        target="_blank"
        onClick={(e) => isEditing && e.preventDefault()}
        className="flex w-[90%] items-center gap-2 focus:outline-none"
      >
        {isEditing ? (
          <Edit3 className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <>
            <img
              src={item.image ?? "/brain.png"}
              alt={item.title ?? "Untitiled website"}
              className="h-4 w-4"
            />
            <ArrowUpRight
              data-upright-icon
              className="hidden h-4 w-4 min-w-4 scale-125"
              strokeWidth={1.5}
            />
          </>
        )}
        {isEditing ? (
          <input
            ref={editInputRef}
            autoFocus
            className="text-rgray-12 w-full bg-transparent focus:outline-none"
            placeholder={item.title ?? "Untitled website"}
            onBlur={(e) => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Escape" && setIsEditing(false)}
          />
        ) : (
          <span className="w-full truncate text-nowrap">
            {item.title ?? "Untitled website"}
          </span>
        )}
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-auto w-4 min-w-4 rounded-[0.15rem] opacity-0 focus:opacity-100 focus:outline-none">
            <MoreHorizontal className="h-4 w-4 min-w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-5">
          <DropdownMenuItem onClick={() => window.open(item.url)}>
            <ArrowUpRight
              className="mr-2 h-4 w-4 scale-125"
              strokeWidth={1.5}
            />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              setIsEditing(true);
            }}
          >
            <Edit3 className="mr-2 h-4 w-4  " strokeWidth={1.5} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-red-100 focus:text-red-400 dark:focus:bg-red-100/10">
            <Trash2 className="mr-2 h-4 w-4 " strokeWidth={1.5} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
