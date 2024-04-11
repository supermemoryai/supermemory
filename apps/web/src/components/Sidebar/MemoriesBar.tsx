import { Editor } from "novel";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  MemoryWithImage,
  MemoryWithImages3,
  MemoryWithImages2,
} from "@/assets/MemoryWithImages";
import { type CollectedSpaces } from "../../../types/memory";
import { Input, InputWithIcon } from "../ui/input";
import {
  ArrowUpRight,
  Edit3,
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
} from "../ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { Variant, useAnimate, motion } from "framer-motion";
import { useMemory } from "@/contexts/MemoryContext";
import { SpaceIcon } from "@/assets/Memories";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { Label } from "../ui/label";
import useViewport from "@/hooks/useViewport";
import useTouchHold from "@/hooks/useTouchHold";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { AddMemoryPage, NoteAddPage } from "./AddMemoryDialog";

export function MemoriesBar() {
  const [parent, enableAnimations] = useAutoAnimate();
  const { spaces, deleteSpace } = useMemory();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [addMemoryState, setAddMemoryState] = useState<
    "page" | "note" | "space" | null
  >(null);

  return (
    <div className="text-rgray-11 flex w-full flex-col items-start py-8 text-left">
      <div className="w-full px-8">
        <h1 className="w-full text-2xl">Your Memories</h1>
        <InputWithIcon
          placeholder="Search"
          icon={<Search className="text-rgray-11 h-5 w-5 opacity-50" />}
          className="bg-rgray-4 mt-2 w-full"
        />
      </div>
      <div className="mt-2 flex w-full px-8">
        <AddMemoryModal type={addMemoryState}>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 hover:bg-rgray-4 ml-auto flex items-center justify-center rounded-md px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2">
                <Plus className="mr-2 h-5 w-5" />
                Add
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
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
              <DropdownMenuItem>
                <SpaceIcon className="mr-2 h-4 w-4" />
                Space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </AddMemoryModal>
      </div>
      <div
        ref={parent}
        className="grid w-full grid-flow-row grid-cols-3 gap-1 px-2 py-5"
      >
        {spaces.map((space) => (
          <SpaceItem
            onDelete={() => deleteSpace(space.id)}
            key={space.id}
            {...space}
          />
        ))}
      </div>
    </div>
  );
}

const SpaceExitVariant: Variant = {
  opacity: 0,
  scale: 0,
  borderRadius: "50%",
  background: "var(--gray-1)",
  transition: {
    duration: 0.2,
  },
};

export function SpaceItem({
  title,
  content,
  id,
  onDelete,
}: CollectedSpaces & { onDelete: () => void }) {
  const [itemRef, animateItem] = useAnimate();
  const { width } = useViewport();

  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const touchEventProps = useTouchHold({
    onHold() {
      setMoreDropdownOpen(true);
    },
  });

  return (
    <motion.div
      ref={itemRef}
      {...touchEventProps}
      className="hover:bg-rgray-2 has-[[data-state='true']]:bg-rgray-2 has-[[data-space-text]:focus-visible]:bg-rgray-2 has-[[data-space-text]:focus-visible]:ring-rgray-7 [&:has-[[data-space-text]:focus-visible]>[data-more-button]]:opacity-100 relative flex select-none flex-col-reverse items-center justify-center rounded-md p-2 pb-4 text-center font-normal ring-transparent transition has-[[data-space-text]:focus-visible]:outline-none has-[[data-space-text]:focus-visible]:ring-2 md:has-[[data-state='true']]:bg-transparent [&:hover>[data-more-button]]:opacity-100"
    >
      <button data-space-text className="focus-visible:outline-none">
        {title}
      </button>
      <SpaceMoreButton
        isOpen={moreDropdownOpen}
        setIsOpen={setMoreDropdownOpen}
        onDelete={() => {
          if (!itemRef.current || width < 768) {
            onDelete();
            return;
          }
          const trash = document.querySelector("#trash")! as HTMLDivElement;
          const trashBin = document.querySelector("#trash-button")!;
          const trashRect = trashBin.getBoundingClientRect();
          const scopeRect = itemRef.current.getBoundingClientRect();
          const el = document.createElement("div");
          el.style.position = "fixed";
          el.style.top = "0";
          el.style.left = "0";
          el.style.width = "15px";
          el.style.height = "15px";
          el.style.backgroundColor = "var(--gray-7)";
          el.style.zIndex = "60";
          el.style.borderRadius = "50%";
          el.style.transform = "scale(5)";
          el.style.opacity = "0";
          trash.dataset["open"] = "true";
          const initial = {
            x: scopeRect.left + scopeRect.width / 2,
            y: scopeRect.top + scopeRect.height / 2,
          };
          const delta = {
            x:
              trashRect.left +
              trashRect.width / 2 -
              scopeRect.left +
              scopeRect.width / 2,
            y:
              trashRect.top +
              trashRect.height / 4 -
              scopeRect.top +
              scopeRect.height / 2,
          };
          const end = {
            x: trashRect.left + trashRect.width / 2,
            y: trashRect.top + trashRect.height / 4,
          };
          el.style.offsetPath = `path('M ${initial.x} ${initial.y} Q ${delta.x * 0.01} ${delta.y * 0.01} ${end.x} ${end.y}`;
          animateItem(itemRef.current, SpaceExitVariant, {
            duration: 0.2,
          }).then(() => {
            itemRef.current.style.scale = "0";
            onDelete();
          });
          document.body.appendChild(el);
          el.animate(
            {
              transform: ["scale(5)", "scale(1)"],
              opacity: [0, 0.3, 1],
            },
            {
              duration: 200,
              easing: "cubic-bezier(0.64, 0.57, 0.67, 1.53)",
              fill: "forwards",
            },
          );
          el.animate(
            {
              offsetDistance: ["0%", "100%"],
            },
            {
              duration: 2000,
              easing: "cubic-bezier(0.64, 0.57, 0.67, 1.53)",
              fill: "forwards",
              delay: 200,
            },
          ).onfinish = () => {
            el.animate(
              { transform: "scale(0)", opacity: 0 },
              { duration: 200, fill: "forwards" },
            ).onfinish = () => {
              el.remove();
            };
          };
        }}
      />
      {content.length > 2 ? (
        <MemoryWithImages3
          className="h-24 w-24"
          id={id.toString()}
          images={content.map((c) => c.image).reverse() as string[]}
        />
      ) : content.length === 1 ? (
        <MemoryWithImage
          className="h-24 w-24"
          id={id.toString()}
          image={content[0].image!}
        />
      ) : (
        <MemoryWithImages2
          className="h-24 w-24"
          id={id.toString()}
          images={content.map((c) => c.image).reverse() as string[]}
        />
      )}
    </motion.div>
  );
}

export function SpaceMoreButton({
  onDelete,
  isOpen,
  setIsOpen,
}: {
  onDelete?: () => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}) {
  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-more-button
            className="hover:bg-rgray-3 focus-visible:bg-rgray-3 focus-visible:ring-rgray-7 absolute right-2 top-2 scale-0 rounded-md p-1 opacity-0 ring-transparent transition focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 md:block md:scale-100 md:bg-transparent"
          >
            <MoreHorizontal className="text-rgray-11 h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>
            <ArrowUpRight
              className="mr-2 h-4 w-4 scale-125"
              strokeWidth={1.5}
            />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}>
            <Edit3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="focus:bg-red-100 focus:text-red-400 dark:focus:bg-red-100/10"
          >
            <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Move to Trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function AddMemoryModal({
  type,
  children,
}: {
  type: "page" | "note" | "space" | null;
  children?: React.ReactNode | React.ReactNode[];
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
          <AddMemoryPage />
        ) : type === "note" ? (
          <NoteAddPage closeDialog={() => setIsDialogOpen(false)} />
        ) : (
          <></>
        )}
      </DialogContent>
    </Dialog>
  );
}
