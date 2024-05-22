import { fetchContentForSpace, getSpace } from "@/actions/db";
import { useMemory } from "@/contexts/MemoryContext";
import { StoredContent, StoredSpace } from "@/server/db/schema";
import {
  Edit3,
  Loader,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Text,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input, InputWithIcon } from "../ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AddMemoryModal, MemoryItem } from "./MemoriesBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DialogTrigger } from "../ui/dialog";

export function ExpandedSpace({
  spaceId,
  back,
}: {
  spaceId: number;
  back: () => void;
}) {
  const { updateMemory, updateSpace, search } = useMemory();

  const [parent, enableAnimations] = useAutoAnimate();

  const inputRef = useRef<HTMLInputElement>(null);

  const [contentForSpace, setContentForSpace] = useState<StoredContent[]>([]);

  const [lastUpdatedTitle, setLastUpdatedTitle] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const debouncedTitle = useDebounce(title, 500);

  const [loading, setLoading] = useState(true);

  const [saveLoading, setSaveLoading] = useState(false);

  const [searchQuery, setSearcyQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const query = useDebounce(searchQuery, 500);

  const [searchResults, setSearchResults] = useState<StoredContent[]>([]);

  const [addMemoryState, setAddMemoryState] = useState<
    "page" | "note" | "existing-memory" | "space" | null
  >(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const title = (await getSpace(spaceId))?.name ?? "";
      setTitle(title);
      setLastUpdatedTitle(title);
      setContentForSpace((await fetchContentForSpace(spaceId)) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (
      debouncedTitle.trim().length < 1 ||
      debouncedTitle.trim() === lastUpdatedTitle?.trim()
    )
      return;
    (async () => {
      setSaveLoading(true);
      await updateSpace(spaceId, debouncedTitle.trim());
      setLastUpdatedTitle(debouncedTitle);
      setSaveLoading(false);
    })();
  }, [debouncedTitle]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    (async () => {
      setSearchResults(
        (
          await search(q, {
            filter: { spaces: false },
            memoriesRelativeToSpace: {
              fromSpaces: [spaceId],
            },
          })
        ).map((i) => i.memory!),
      );
      setSearchLoading(false);
    })();
  }, [query]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-rgray-11 flex w-full flex-col items-start py-8 text-left">
      <div className="flex w-full items-center justify-start gap-2 px-8">
        <button
          onClick={back}
          className="focus-visible:ring-offset-rgray-3 focus-visible:ring-rgray-7 rounded-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <Input
          ref={inputRef}
          data-error="false"
          className="w-full border-none p-0 text-xl ring-0 placeholder:text-white/30 placeholder:transition placeholder:duration-500 focus-visible:ring-0 data-[error=true]:placeholder:text-red-400"
          placeholder="Title of the space"
          data-modal-autofocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={() => {
            inputRef.current?.focus();
            inputRef.current?.animate(
              {
                opacity: [1, 0.2, 1],
              },
              {
                duration: 100,
              },
            );
          }}
          className="focus-visible:ring-offset-rgray-3 focus-visible:ring-rgray-7 rounded-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {saveLoading ? (
            <Loader className="h-5 w-5 animate-spin opacity-70" />
          ) : (
            <Edit3 className="h-5 w-5 opacity-70" />
          )}
        </button>
      </div>
      <div className="w-full px-8">
        <InputWithIcon
          placeholder="Search"
          icon={
            searchLoading ? (
              <Loader className="text-rgray-11 h-5 w-5 animate-spin opacity-50" />
            ) : (
              <Search className="text-rgray-11 h-5 w-5 opacity-50" />
            )
          }
          className="bg-rgray-4 mt-2 w-full"
          value={searchQuery}
          onChange={(e) => setSearcyQuery(e.target.value)}
        />
      </div>
      <div className="mt-2 w-full px-8">
        <AddMemoryModal
          onAdd={(data) => {
            if (!data) {
              setLoading(true);
              (async () => {
                const title = (await getSpace(spaceId))?.name ?? "";
                setTitle(title);
                setLastUpdatedTitle(title);
                setContentForSpace((await fetchContentForSpace(spaceId)) ?? []);
                setLoading(false);
              })();
            } else if (Object.hasOwn(data, "url")) {
              const _data = data as StoredContent;
              setContentForSpace((prev) => [...prev, _data]);
            }
          }}
          data={{ space: { title, id: spaceId }, notInSpaces: [spaceId] }}
          defaultSpaces={[spaceId]}
          type={addMemoryState}
        >
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
                    setAddMemoryState("existing-memory");
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Existing Memory
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogTrigger className="block w-full">
                <DropdownMenuItem
                  onClick={() => {
                    setAddMemoryState("page");
                  }}
                >
                  <StickyNote className="mr-2 h-4 w-4" />
                  Page
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
            </DropdownMenuContent>
          </DropdownMenu>
        </AddMemoryModal>
      </div>
      <div
        ref={parent}
        className="grid w-full grid-flow-row grid-cols-3 gap-1 px-2 py-5"
      >
        {query.trim().length > 0 ? (
          <>
            {searchResults.map((memory, i) => (
              <MemoryItem
                removeFromSpace={async () => {
                  await updateMemory(memory.id, {
                    removedFromSpaces: [spaceId],
                  });
                  setContentForSpace((prev) =>
                    prev.filter((s) => s.id !== memory.id),
                  );
                  setSearchResults((prev) =>
                    prev.filter((i) => i.id !== memory.id),
                  );
                }}
                {...memory!}
                key={i}
                onDelete={() => {
                  setContentForSpace((prev) =>
                    prev.filter((s) => s.id !== memory.id),
                  );
                  setSearchResults((prev) =>
                    prev.filter((i) => i.id !== memory.id),
                  );
                }}
              />
            ))}
          </>
        ) : (
          contentForSpace.map((m) => (
            <MemoryItem
              key={m.id}
              {...m}
              onDelete={() =>
                setContentForSpace((prev) => prev.filter((s) => s.id !== m.id))
              }
              removeFromSpace={async () => {
                await updateMemory(m.id, {
                  removedFromSpaces: [spaceId],
                });
                setContentForSpace((prev) => prev.filter((s) => s.id !== m.id));
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
