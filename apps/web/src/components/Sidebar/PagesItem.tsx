"use client";
import { cleanUrl } from "@/lib/utils";
import { StoredContent } from "@/server/db/schema";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Label } from "../ui/label";
import {
  ArrowUpRight,
  MoreHorizontal,
  Edit3,
  Trash2,
  Save,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "../ui/drawer";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export const PageItem: React.FC<{ item: StoredContent }> = ({ item }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  return (
    <div className="hover:bg-rgray-5 focus-within:bg-rgray-5 flex w-full items-center rounded-full py-1 pl-3 pr-2 transition [&:hover>a>div>[data-upright-icon]]:scale-125 [&:hover>a>div>[data-upright-icon]]:opacity-100 [&:hover>a>div>[data-upright-icon]]:delay-150 [&:hover>a>div>img]:scale-75 [&:hover>a>div>img]:opacity-0 [&:hover>a>div>img]:delay-0 [&:hover>button]:opacity-100">
      <a
        href={item.url}
        target="_blank"
        className="flex w-[90%] items-center gap-2 focus-visible:outline-none"
      >
        <div className="relative h-4 min-w-4">
          <img
            src={item.image ?? "/brain.png"}
            alt={item.title ?? "Untitiled website"}
            className="z-1 h-4 w-4 transition-[transform,opacity] delay-150 duration-150"
          />
          <ArrowUpRight
            data-upright-icon
            className="absolute left-1/2 top-1/2 z-[2] h-4 w-4 min-w-4 -translate-x-1/2 -translate-y-1/2 scale-75 opacity-0 transition-[transform,opacity] duration-150"
            strokeWidth={1.5}
          />
        </div>

        <span className="w-full truncate text-nowrap">
          {item.title ?? "Untitled website"}
        </span>
      </a>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button className="ml-auto w-4 min-w-4 rounded-[0.15rem] opacity-0 focus-visible:opacity-100 focus-visible:outline-none">
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
            onClick={() => {
              setIsDropdownOpen(false);
              setIsEditDrawerOpen(true);
            }}
          >
            <Edit3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="focus-visible:bg-red-100 focus-visible:text-red-400 dark:focus-visible:bg-red-100/10">
            <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Drawer
        shouldScaleBackground
        open={isEditDrawerOpen}
        onOpenChange={setIsEditDrawerOpen}
      >
        <DrawerContent className="pb-10 lg:px-[25vw]">
          <DrawerHeader className="relative mt-10 px-0">
            <DrawerTitle className=" flex w-full justify-between">
              Edit Page Details
            </DrawerTitle>
            <DrawerDescription>Change the page details</DrawerDescription>
            <a
              target="_blank"
              href={item.url}
              className="text-rgray-11/90 bg-rgray-3 text-md absolute right-0 top-0 flex w-min translate-y-1/2 items-center justify-center gap-1 rounded-full px-5 py-1"
            >
              <img src={item.image ?? "/brain.png"} className="h-4 w-4" />
              {cleanUrl(item.url)}
            </a>
          </DrawerHeader>

          <div className="mt-5">
            <Label>Title</Label>
            <Input
              className=""
              required
              value={item.title ?? ""}
              placeholder={item.title ?? "Enter the title for the page"}
            />
          </div>
          <div className="mt-5">
            <Label>Additional Context</Label>
            <Textarea
              className=""
              value={item.content ?? ""}
              placeholder={"Enter additional context for this page"}
            />
          </div>
          <DrawerFooter className="flex flex-row-reverse items-center justify-end px-0 pt-5">
            <DrawerClose className="flex items-center justify-center rounded-md px-3 py-2 ring-2 ring-transparent transition hover:bg-blue-100 hover:text-blue-400 focus-visible:bg-blue-100 focus-visible:text-blue-400 focus-visible:outline-none focus-visible:ring-blue-200 dark:hover:bg-blue-100/10 dark:focus-visible:bg-blue-100/10 dark:focus-visible:ring-blue-200/30">
              <Save className="mr-2 h-4 w-4 " strokeWidth={1.5} />
              Save
            </DrawerClose>
            <DrawerClose className="hover:bg-rgray-3 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 flex items-center justify-center rounded-md px-3 py-2 ring-2 ring-transparent transition focus-visible:outline-none">
              Cancel
            </DrawerClose>
            <DrawerClose className="mr-auto flex items-center justify-center rounded-md bg-red-100 px-3 py-2 text-red-400 ring-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-red-200 dark:bg-red-100/10 dark:focus-visible:ring-red-200/30">
              <Trash2 className="mr-2 h-4 w-4 " strokeWidth={1.5} />
              Delete
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export const AddNewPagePopover: React.FC<{
  addNewUrl?: (url: string) => Promise<void>;
}> = ({ addNewUrl }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="focus-visible:ring-rgray-7 ring-offset-rgray-3 ml-auto rounded-sm ring-2 ring-transparent ring-offset-2 focus-visible:outline-none">
          <Plus className="h-4 w-4 min-w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top">
        <h1 className="mb-2 flex items-center justify-between ">
          Add a new page
          <button
            onClick={() => {
              setIsOpen(false);
              addNewUrl?.(url);
            }}
            className="hover:bg-rgray-3 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 ring-offset-rgray-3 rounded-sm ring-2 ring-transparent ring-offset-2 transition focus-visible:outline-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </h1>
        <Input
          className="w-full"
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setIsOpen(false);
              addNewUrl?.(url);
            }
          }}
          placeholder="Enter the URL of the page"
        />
      </PopoverContent>
    </Popover>
  );
};
