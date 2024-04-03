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
  Tags,
  ChevronDown,
  Edit3,
  Trash2,
  Save,
  ChevronRight,
  Plus,
  Minus,
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
import {
  AnimatePresence,
  motion,
  Reorder,
  useMotionValue,
} from "framer-motion";

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
    space: ""
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
    space: ""
  },
  {
    id: 3,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
  {
    id: 4,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
  {
    id: 5,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
  {
    id: 6,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
  {
    id: 7,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
  {
    id: 8,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
  {
    id: 9,
    content: "",
    title: "yxshv/vscode: An unofficial remake of vscode's landing page",
    url: "https://github.com/yxshv/vscode",
    description: "",
    image: "https://github.com/favicon.ico",
    baseUrl: "https://github.com",
    savedAt: new Date(),
    space: ""
  },
];
export const CategoryItem: React.FC<{ item: StoredContent }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const [items, setItems] = useState<StoredContent[]>(pages);

  return (
    <>
      <div className="hover:bg-rgray-5 has-[button:focus]:bg-rgray-5 flex w-full items-center rounded-full py-1 pl-3 pr-2 transition [&:hover>button>div>[data-down-icon]]:scale-125 [&:hover>button>div>[data-down-icon]]:opacity-100 [&:hover>button>div>[data-down-icon]]:delay-150 [&:hover>button>div>[data-tags-icon]]:scale-75 [&:hover>button>div>[data-tags-icon]]:opacity-0 [&:hover>button>div>[data-tags-icon]]:delay-0 [&:hover>button]:opacity-100">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center gap-2 focus-visible:outline-none"
        >
          <div className="relative h-5 min-w-5">
            <Tags
              data-tags-icon
              className="z-1 h-5 w-5 transition-[transform,opacity] delay-150 duration-150"
              strokeWidth={1.5}
            />
            <ChevronDown
              data-down-icon
              className={`absolute left-1/2 top-1/2 z-[2] h-4 w-4 min-w-4 -translate-x-1/2 -translate-y-1/2 scale-75 opacity-0 transition-[transform,opacity] duration-150 ${isExpanded ? "rotate-180" : "rotate-0"}`}
              strokeWidth={1.5}
            />
          </div>

          <span className="w-full truncate text-nowrap text-left">
            {item.title ?? "Untitled website"}
          </span>
        </button>
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
      <AnimatePresence>
        {isExpanded && (
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={setItems}
            as="div"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{
              height: 0,
              transition: {},
            }}
            layoutScroll
            className="flex max-h-32 w-full flex-col items-center overflow-y-auto pl-7"
          >
            <AnimatePresence>
              {items.map((item, i) => (
                <CategoryPage
                  key={item.id}
                  index={i}
                  item={item}
                  onRemove={() =>
                    setItems((prev) => prev.filter((_, index) => i !== index))
                  }
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </AnimatePresence>
    </>
  );
};

export const CategoryPage: React.FC<{
  item: StoredContent;
  index: number;
  onRemove?: () => void;
}> = ({ item, onRemove, index }) => {
  return (
    <Reorder.Item
      value={item}
      as="div"
      key={index}
      exit={{ opacity: 0, scale: 0.8 }}
      dragListener={false}
      className="hover:bg-rgray-5  has-[a:focus]:bg-rgray-5 flex w-full items-center rounded-full py-1 pl-3 pr-2 transition [&:hover>a>div>[data-icon]]:scale-125 [&:hover>a>div>[data-icon]]:opacity-100 [&:hover>a>div>[data-icon]]:delay-150 [&:hover>a>div>img]:scale-75 [&:hover>a>div>img]:opacity-0 [&:hover>a>div>img]:delay-0 [&:hover>button]:opacity-100"
    >
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
            data-icon
            className="absolute left-1/2 top-1/2 z-[2] h-4 w-4 min-w-4 -translate-x-1/2 -translate-y-1/2 scale-75 opacity-0 transition-[transform,opacity] duration-150"
            strokeWidth={1.5}
          />
        </div>

        <span className="w-full truncate text-nowrap">
          {item.title ?? "Untitled website"}
        </span>
      </a>
      <button
        onClick={() => onRemove?.()}
        className="ml-auto w-4 min-w-4 rounded-[0.15rem] opacity-0 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <Minus className="h-4 w-4 min-w-4" />
      </button>
    </Reorder.Item>
  );
};
