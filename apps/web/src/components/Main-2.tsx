"use client";
import { MemoryDrawer } from "./MemoryDrawer";
import useViewport from "@/hooks/useViewport";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { Editor } from "novel";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  MemoryWithImage,
  MemoryWithImages3,
  MemoryWithImages2,
} from "@/assets/MemoryWithImages";
import { Input, InputWithIcon } from "./ui/input";
import {
  ArrowUpRight,
  Edit3,
  Loader,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Text,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useEffect, useMemo, useRef, useState } from "react";
import { Variant, useAnimate, motion } from "framer-motion";
import { SearchResult, useMemory } from "@/contexts/MemoryContext";
import { SpaceIcon } from "@/assets/Memories";
import { Dialog, DialogContent } from "./ui/dialog";
import useTouchHold from "@/hooks/useTouchHold";
import { DialogTrigger } from "@radix-ui/react-dialog";
import {
  AddExistingMemoryToSpace,
  AddMemoryPage,
  NoteAddPage,
  SpaceAddPage,
} from "./Sidebar/AddMemoryDialog";
import { ExpandedSpace } from "./Sidebar/ExpandedSpace";
import { StoredContent, StoredSpace } from "@/server/db/schema";
import { useDebounce } from "@/hooks/useDebounce";
import { NoteEdit } from "./Sidebar/EditNoteDialog";
import DeleteConfirmation from "./Sidebar/DeleteConfirmation";

import { ProfileDrawer } from "./ProfileDrawer";

function supportsDVH() {
  try {
    return CSS.supports("height: 100dvh");
  } catch {
    return false;
  }
}

function pseudoRandomizeColorWithName(name: string) {
  const colorsAvailable = [
    "99e9f2",
    "a5d8ff",
    "d0bfff",
    "eebefa",
    "fcc2d7",
    "b2f2bb",
    "96f2d7",
    "ffec99",
    "ffd8a8",
    "ffc9c9",
  ];

  const colorIndex =
    name
      .split("")
      .map((char) => char.charCodeAt(0))
      .reduce((acc, charCode) => acc + charCode, 0) % colorsAvailable.length;

  return colorsAvailable[colorIndex];
}

export default function Main({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { width } = useViewport();

  const [parent, enableAnimations] = useAutoAnimate();
  const { spaces, deleteSpace, freeMemories, search } = useMemory();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [addMemoryState, setAddMemoryState] = useState<
    "page" | "note" | "space" | "existing-memory" | null
  >(null);

  const [expandedSpace, setExpandedSpace] = useState<number | null>(null);

  const [searchQuery, setSearcyQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const query = useDebounce(searchQuery, 500);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    (async () => {
      setSearchResults(await search(q));
      setSearchLoading(false);
    })();
  }, [query]);

  // useEffect(() => {
  //   if (!isOpen) {
  //     setExpandedSpace(null);
  //   }
  // }, [isOpen]);

  if (expandedSpace) {
    return (
      <ExpandedSpace
        spaceId={expandedSpace}
        back={() => setExpandedSpace(null)}
        // close={() => setExpandedSpace(null)}
      />
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <main
          data-sidebar-open={sidebarOpen}
          className={cn(
            "sidebar relative flex w-full flex-col items-end gap-5 overflow-auto bg-[#FFF] px-5 pt-5 transition-[padding-left,padding-top,padding-right] delay-200 duration-200 md:items-center md:gap-10 md:px-72 [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 md:[&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)]",
          )}
        >
          <div className="mt-16 w-full">
            <div className="flex justify-between gap-4">
              <h1 className="w-full text-3xl font-medium tracking-tight">
                Your Memories
              </h1>
              <div className="flex w-full">
                <AddMemoryModal type={addMemoryState}>
                  <DropdownMenu
                    open={isDropdownOpen}
                    onOpenChange={setIsDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <button className="focus-visible:ring-rgray-7 ml-auto flex items-center justify-center rounded-md px-3 py-2 transition hover:bg-stone-200 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2">
                        <Plus className="mr-2 h-5 w-5" />
                        Add
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <DialogTrigger className="block w-full">
                        <DropdownMenuItem
                          onClick={() => {
                            setAddMemoryState("page");
                          }}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Page to Memory
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogTrigger className="block w-full">
                        <DropdownMenuItem
                          onClick={() => {
                            setAddMemoryState("note");
                          }}
                        >
                          <Text className="mr-2 h-4 w-4" />
                          Note
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogTrigger className="block w-full">
                        <DropdownMenuItem
                          onClick={() => {
                            setAddMemoryState("space");
                          }}
                        >
                          <SpaceIcon className="mr-2 h-4 w-4" />
                          Space
                        </DropdownMenuItem>
                      </DialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </AddMemoryModal>
              </div>
            </div>
            <InputWithIcon
              placeholder="Search"
              icon={
                searchLoading ? (
                  <Loader className="h-5 w-5 animate-spin opacity-50" />
                ) : (
                  <Search className="h-5 w-5 opacity-50" />
                )
              }
              className="mt-4 w-full text-black"
              value={searchQuery}
              onChange={(e) => setSearcyQuery(e.target.value)}
            />
          </div>
          <div
            ref={parent}
            className="grid w-full grid-flow-row grid-cols-3 gap-4 px-2 py-5"
          >
            {typeof window !== "undefined" ? (
              query.trim().length > 0 ? (
                <>
                  {searchResults.map(({ type, space, memory }, i) => (
                    <>
                      {type === "memory" && (
                        <MemoryItem
                          {...memory!}
                          key={i}
                          onDelete={() => {
                            setSearchResults((prev) =>
                              prev.filter((i) => i.memory?.id !== memory.id),
                            );
                          }}
                        />
                      )}
                      {type === "space" && (
                        <SpaceItem
                          {...space!}
                          key={i}
                          onDelete={() => {
                            setSearchResults((prev) =>
                              prev.filter((i) => i.space?.id !== space.id),
                            );
                            deleteSpace(space.id);
                          }}
                        />
                      )}
                    </>
                  ))}
                </>
              ) : (
                <>
                  {spaces.map((space) => (
                    <SpaceItem
                      onDelete={() => deleteSpace(space.id)}
                      key={space.id}
                      onClick={() => setExpandedSpace(space.id)}
                      {...space}
                    />
                  ))}
                  {freeMemories.map((m) => (
                    <MemoryItem {...m} key={m.id} />
                  ))}
                </>
              )
            ) : (
              <>
                {Array.from({
                  length: spaces.length + freeMemories.length,
                }).map((_, i) => (
                  <div className="h-32 w-full animate-pulse rounded-2xl bg-stone-300/50"></div>
                ))}
              </>
            )}
          </div>
          <div className="absolute right-10 top-10 z-[100] block md:hidden">
            {width <= 768 && <ProfileDrawer />}
          </div>
        </main>
        {width <= 768 && <MemoryDrawer />}
      </AnimatePresence>
    </>
  );
}

export function MemoryItem(
  props: StoredContent & {
    onDelete?: () => void;
    removeFromSpace?: () => Promise<void>;
  },
) {
  const { id, title, image, type, url, onDelete, removeFromSpace } = props;

  const { deleteMemory } = useMemory();

  const name = title
    ? title.length > 20
      ? title.slice(0, 20) + "..."
      : title
    : "Untitled Memory";

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const touchEventProps = useTouchHold({
    onHold() {
      setMoreDropdownOpen(true);
    },
  });
  return (
    <Dialog
      open={type === "note" ? isDialogOpen : false}
      onOpenChange={setIsDialogOpen}
    >
      <DialogTrigger asChild>
        <button
          onClick={() => (type === "page" ? window.open(url) : null)}
          data-space-text
          className="relative flex h-min select-none flex-col items-center justify-center gap-2 text-center font-normal focus-visible:outline-none"
        >
          <div
            {...touchEventProps}
            className="has-[[data-space-text]:focus-visible]:ring-rgray-7 [&:has-[[data-space-text]:focus-visible]>[data-more-button]]:opacity-100 flex h-32 w-full items-center justify-center rounded-2xl border-2 border-black/20 p-2 pb-4 shadow-sm ring-transparent transition duration-150 ease-out hover:scale-105 has-[[data-space-text]:focus-visible]:outline-none has-[[data-space-text]:focus-visible]:ring-2 md:has-[[data-state='true']]:bg-transparent [&:hover>[data-more-button]]:opacity-100"
            style={{
              backgroundColor: `#${pseudoRandomizeColorWithName(name)}`,
            }}
          >
            {type === "page" ? (
              <PageMoreButton
                isOpen={moreDropdownOpen}
                setIsOpen={setMoreDropdownOpen}
                removeFromSpace={removeFromSpace}
                onDelete={() => {
                  deleteMemory(id);
                  onDelete?.();
                }}
                url={url}
              />
            ) : type === "note" ? (
              <NoteMoreButton
                isOpen={moreDropdownOpen}
                setIsOpen={setMoreDropdownOpen}
                removeFromSpace={removeFromSpace}
                onEdit={() => setIsDialogOpen(true)}
                onDelete={() => {
                  deleteMemory(id);
                  onDelete?.();
                }}
              />
            ) : null}

            <div className="flex h-24 w-24 items-center justify-center">
              {type === "page" ? (
                <img
                  className="h-16 w-16"
                  id={id.toString()}
                  src={image!}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/icons/white_without_bg.png";
                  }}
                />
              ) : type === "note" ? (
                <Text
                  onClick={() => setIsDialogOpen(true)}
                  className="h-16 w-16"
                />
              ) : (
                <></>
              )}
            </div>
          </div>
          {name}
        </button>
      </DialogTrigger>
      <DialogContent className="w-max max-w-[auto]">
        <NoteEdit
          onDelete={onDelete}
          closeDialog={() => setIsDialogOpen(false)}
          memory={props}
        />
      </DialogContent>
    </Dialog>
  );
}

export function SpaceItem({
  name,
  id,
  onDelete,
  onClick,
}: StoredSpace & { onDelete: () => void; onClick?: () => void }) {
  const { cachedMemories } = useMemory();

  const [itemRef, animateItem] = useAnimate();
  const { width } = useViewport();

  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const touchEventProps = useTouchHold({
    onHold() {
      setMoreDropdownOpen(true);
    },
  });

  const spaceMemories = useMemo(() => {
    return cachedMemories.filter((m) => m.space === id);
  }, [cachedMemories]);

  const _name = name.length > 20 ? name.slice(0, 20) + "..." : name;

  return (
    <button
      onClick={onClick}
      data-space-text
      className="relative flex h-min select-none flex-col items-center justify-center gap-2 text-center font-normal focus-visible:outline-none"
    >
      <motion.div
        ref={itemRef}
        {...touchEventProps}
        className="has-[[data-space-text]:focus-visible]:ring-rgray-7 [&:has-[[data-space-text]:focus-visible]>[data-more-button]]:opacity-100 flex h-32 w-full items-center justify-center rounded-2xl border-2 border-black/20 p-2  pb-4 shadow-sm ring-transparent transition duration-150 ease-out hover:scale-105 has-[[data-space-text]:focus-visible]:outline-none has-[[data-space-text]:focus-visible]:ring-2 md:has-[[data-state='true']]:bg-transparent [&:hover>[data-more-button]]:opacity-100"
        style={{
          backgroundColor: `#${pseudoRandomizeColorWithName(name)}`,
        }}
      >
        <SpaceMoreButton
          isOpen={moreDropdownOpen}
          setIsOpen={setMoreDropdownOpen}
          onEdit={onClick}
          onDelete={onDelete}
        />
        {spaceMemories.length > 2 ? (
          <MemoryWithImages3
            onClick={onClick}
            className="h-24 w-24"
            id={id.toString()}
            images={
              spaceMemories
                .map((c) => (c.type === "note" ? "/note.svg" : c.image))
                .reverse() as string[]
            }
          />
        ) : spaceMemories.length > 1 ? (
          <MemoryWithImages2
            onClick={onClick}
            className="h-24 w-24"
            id={id.toString()}
            images={
              spaceMemories
                .map((c) => (c.type === "note" ? "/note.svg" : c.image))
                .reverse() as string[]
            }
          />
        ) : spaceMemories.length === 1 ? (
          <MemoryWithImage
            onClick={onClick}
            className="h-24 w-24"
            id={id.toString()}
            image={
              spaceMemories[0].type === "note"
                ? "/note.svg"
                : spaceMemories[0].image!
            }
          />
        ) : (
          <div
            onClick={onClick}
            className="flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <span className="text-stone-800/80">Empty Space</span>
          </div>
        )}
      </motion.div>

      {_name}
    </button>
  );
}

export function SpaceMoreButton({
  onDelete,
  isOpen,
  setIsOpen,
  onEdit,
}: {
  onDelete?: () => void;
  isOpen?: boolean;
  onEdit?: () => void;
  setIsOpen?: (open: boolean) => void;
}) {
  return (
    <DeleteConfirmation onDelete={onDelete} trigger={false}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-more-button
            className="focus-visible:ring-rgray-7 absolute right-2 top-2 scale-0 rounded-md p-1 opacity-0 ring-transparent transition hover:bg-white focus-visible:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 md:block md:scale-100 md:bg-transparent"
          >
            <MoreHorizontal className="h-5 w-5 text-black" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit
          </DropdownMenuItem>
          <DialogTrigger asChild>
            <DropdownMenuItem className="focus:bg-red-100 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Delete
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
    </DeleteConfirmation>
  );
}

export function PageMoreButton({
  onDelete,
  isOpen,
  setIsOpen,
  url,
  removeFromSpace,
}: {
  onDelete?: () => void;
  isOpen?: boolean;
  url: string;
  setIsOpen?: (open: boolean) => void;
  removeFromSpace?: () => Promise<void>;
}) {
  return (
    <DeleteConfirmation onDelete={onDelete} trigger={false}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-more-button
            className="focus-visible:ring-rgray-7 absolute right-2 top-2 scale-0 rounded-md p-1 opacity-0 ring-transparent transition hover:bg-white focus-visible:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 md:block md:scale-100 md:bg-transparent"
          >
            <MoreHorizontal className="h-5 w-5 text-black" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => window.open(url)}>
            <ArrowUpRight
              className="mr-2 h-4 w-4 scale-125"
              strokeWidth={1.5}
            />
            Open
          </DropdownMenuItem>
          {removeFromSpace && (
            <DropdownMenuItem onClick={removeFromSpace}>
              <Minus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Remove from space
            </DropdownMenuItem>
          )}
          <DialogTrigger asChild>
            <DropdownMenuItem className="focus:bg-red-100 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Delete
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
    </DeleteConfirmation>
  );
}

export function NoteMoreButton({
  onDelete,
  isOpen,
  setIsOpen,
  onEdit,
  removeFromSpace,
}: {
  onDelete?: () => void;
  isOpen?: boolean;
  onEdit?: () => void;
  setIsOpen?: (open: boolean) => void;
  removeFromSpace?: () => Promise<void>;
}) {
  return (
    <DeleteConfirmation onDelete={onDelete} trigger={false}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-more-button
            className="focus-visible:ring-rgray-7 absolute right-2 top-2 scale-0 rounded-md p-1 opacity-0 ring-transparent transition hover:bg-white focus-visible:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 md:block md:scale-100 md:bg-transparent"
          >
            <MoreHorizontal className="h-5 w-5 text-black" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit
          </DropdownMenuItem>
          {removeFromSpace && (
            <DropdownMenuItem onClick={removeFromSpace}>
              <Minus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Remove from space
            </DropdownMenuItem>
          )}
          <DialogTrigger asChild>
            <DropdownMenuItem className="focus:bg-red-100 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Delete
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
    </DeleteConfirmation>
  );
}

export function AddMemoryModal({
  type,
  children,
  defaultSpaces,
  onAdd,
  data,
}: {
  type: "page" | "note" | "space" | "existing-memory" | null;
  children?: React.ReactNode | React.ReactNode[];
  defaultSpaces?: number[];
  data?: {
    space?: {
      title: string;
      id: number;
    };
    fromSpaces?: number[];
    notInSpaces?: number[];
  };
  onAdd?: (data?: StoredSpace | StoredContent | StoredContent[]) => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {children}
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const novel = document.querySelector('[contenteditable="true"]') as
            | HTMLDivElement
            | undefined;
          if (novel) {
            novel.autofocus = false;
            novel.onfocus = () => {
              (
                document.querySelector("[data-modal-autofocus]") as
                  | HTMLInputElement
                  | undefined
              )?.focus();
              novel.onfocus = null;
            };
          }
          (
            document.querySelector("[data-modal-autofocus]") as
              | HTMLInputElement
              | undefined
          )?.focus();
        }}
        className="w-max max-w-[auto]"
      >
        {type === "page" ? (
          <AddMemoryPage
            onAdd={onAdd}
            defaultSpaces={defaultSpaces}
            closeDialog={() => setIsDialogOpen(false)}
          />
        ) : type === "note" ? (
          <NoteAddPage
            onAdd={onAdd}
            defaultSpaces={defaultSpaces}
            closeDialog={() => setIsDialogOpen(false)}
          />
        ) : type === "space" ? (
          <SpaceAddPage
            onAdd={onAdd}
            closeDialog={() => setIsDialogOpen(false)}
          />
        ) : type === "existing-memory" ? (
          <AddExistingMemoryToSpace
            onAdd={onAdd}
            fromSpaces={data?.fromSpaces}
            notInSpaces={data?.notInSpaces}
            space={data!.space!}
            closeDialog={() => setIsDialogOpen(false)}
          />
        ) : (
          <></>
        )}
      </DialogContent>
    </Dialog>
  );
}
