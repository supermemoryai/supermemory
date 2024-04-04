import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  MemoryWithImage,
  MemoryWithImages3,
  MemoryWithImages2,
} from "@/assets/MemoryWithImages";
import { type Space } from "../../../types/memory";
import { InputWithIcon } from "../ui/input";
import {
  ArrowUpRight,
  Edit3,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  animate,
  AnimatePresence,
  LayoutGroup,
  motion,
  useAnimate,
  Variant,
} from "framer-motion";
import { useRef, useState } from "react";

const spaces: Space[] = [
  {
    id: 1,
    title: "Cool Tech",
    description: "Really cool mind blowing tech",
    content: [
      {
        id: 1,
        title: "Perplexity",
        description: "A good ui",
        content: "",
        image: "https://perplexity.ai/favicon.ico",
        url: "https://perplexity.ai",
        savedAt: new Date(),
        baseUrl: "https://perplexity.ai",
        space: "Cool tech",
      },
      {
        id: 2,
        title: "Pi.ai",
        description: "A good ui",
        content: "",
        image: "https://pi.ai/pi-logo-192.png?v=2",
        url: "https://pi.ai",
        savedAt: new Date(),
        baseUrl: "https://pi.ai",
        space: "Cool tech",
      },
      {
        id: 3,
        title: "Visual Studio Code",
        description: "A good ui",
        content: "",
        image: "https://code.visualstudio.com/favicon.ico",
        url: "https://code.visualstudio.com",
        savedAt: new Date(),
        baseUrl: "https://code.visualstudio.com",
        space: "Cool tech",
      },
    ],
  },
  {
    id: 2,
    title: "Cool Courses",
    description: "Amazng",
    content: [
      {
        id: 1,
        title: "Animation on the web",
        description: "A good ui",
        content: "",
        image: "https://animations.dev/favicon.ico",
        url: "https://animations.dev",
        savedAt: new Date(),
        baseUrl: "https://animations.dev",
        space: "Cool courses",
      },
      {
        id: 2,
        title: "Tailwind Course",
        description: "A good ui",
        content: "",
        image:
          "https://tailwindcss.com/_next/static/media/tailwindcss-mark.3c5441fc7a190fb1800d4a5c7f07ba4b1345a9c8.svg",
        url: "https://tailwindcss.com",
        savedAt: new Date(),
        baseUrl: "https://tailwindcss.com",
        space: "Cool courses",
      },
    ],
  },
  {
    id: 3,
    title: "Cool Libraries",
    description: "Really cool mind blowing tech",
    content: [
      {
        id: 1,
        title: "Perplexity",
        description: "A good ui",
        content: "",
        image: "https://yashverma.me/logo.jpg",
        url: "https://perplexity.ai",
        savedAt: new Date(),
        baseUrl: "https://perplexity.ai",
        space: "Cool libraries",
      },
    ],
  },
];

export function MemoriesBar() {
  const [parent, enableAnimations] = useAutoAnimate();
  const [currentSpaces, setCurrentSpaces] = useState(spaces);

  console.log("currentSpaces: ", currentSpaces);

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
      <div
        ref={parent}
        className="grid w-full grid-flow-row grid-cols-3 gap-1 px-2 py-5"
      >
        {currentSpaces.map((space) => (
          <SpaceItem
            onDelete={() =>
              setCurrentSpaces((prev) => prev.filter((s) => s.id !== space.id))
            }
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
  description,
  content,
  id,
  onDelete,
}: Space & { onDelete: () => void }) {
  const [itemRef, animateItem] = useAnimate();

  return (
    <motion.div
      ref={itemRef}
      className="hover:bg-rgray-2 has-[[data-space-text]:focus-visible]:bg-rgray-2 has-[[data-space-text]:focus-visible]:ring-rgray-7 [&:has-[[data-space-text]:focus-visible]>[data-more-button]]:opacity-100 relative flex flex-col-reverse items-center justify-center rounded-md p-2 pb-4 text-center font-normal ring-transparent transition has-[[data-space-text]:focus-visible]:outline-none has-[[data-space-text]:focus-visible]:ring-2 [&:hover>[data-more-button]]:opacity-100"
    >
      <button data-space-text className="focus-visible:outline-none">
        {title}
      </button>
      <SpaceMoreButton
        onDelete={() => {
          if (!itemRef.current) return;
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

export function SpaceMoreButton({ onDelete }: { onDelete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-more-button
            className="hover:bg-rgray-3 focus-visible:bg-rgray-3 focus-visible:ring-rgray-7 absolute  right-2 top-2 rounded-md p-1 opacity-0 ring-transparent transition focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2"
          >
            <MoreHorizontal className="text-rgray-11 h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
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
