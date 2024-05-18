import { Editor } from "novel";
import { DialogClose, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";
import { FilterSpaces } from "./FilterCombobox";
import { useMemory } from "@/contexts/MemoryContext";
import { Loader, Plus, Trash, X } from "lucide-react";
import { motion } from "framer-motion";
import { StoredContent } from "@/server/db/schema";
import { fetchContent } from "@/actions/db";
import { isArraysEqual } from "@/lib/utils";
import DeleteConfirmation from "./DeleteConfirmation";

export function NoteEdit({
  memory,
  closeDialog,
  onDelete,
}: {
  memory: StoredContent;
  closeDialog: () => any;
  onDelete?: () => void;
}) {
  const { updateMemory, deleteMemory } = useMemory();

  const [initialSpaces, setInitialSpaces] = useState<number[]>([]);
  const [selectedSpacesId, setSelectedSpacesId] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(memory.title ?? "");
  const [content, setContent] = useState(memory.content);
  const [loading, setLoading] = useState(false);

  function check(): boolean {
    const data = {
      name: name.trim(),
      content,
    };
    if (!data.name || data.name.length < 1) {
      if (!inputRef.current) {
        alert("Please enter a name for the note");
        return false;
      }
      inputRef.current.value = "";
      inputRef.current.placeholder = "Please enter a title for the note";
      inputRef.current.dataset["error"] = "true";
      setTimeout(() => {
        inputRef.current!.placeholder = "Title of the note";
        inputRef.current!.dataset["error"] = "false";
      }, 500);
      inputRef.current.focus();
      return false;
    }
    return true;
  }

  useEffect(() => {
    fetchContent(memory.id).then((data) => {
      if (data?.spaces) {
        setInitialSpaces(data.spaces);
        setSelectedSpacesId(data.spaces);
      }
    });
  }, []);

  return (
    <div>
      <Input
        ref={inputRef}
        data-error="false"
        className="w-full border-none p-0 text-xl ring-0 placeholder:transition placeholder:duration-500 focus-visible:ring-0 data-[error=true]:placeholder:text-red-400"
        placeholder="Title of the note"
        value={name}
        disabled={loading}
        onChange={(e) => setName(e.target.value)}
      />
      <Editor
        disableLocalStorage
        defaultValue={memory.content}
        onUpdate={(editor) => {
          if (!editor) return;
          setContent(editor.storage.markdown.getMarkdown());
        }}
        extensions={[Markdown]}
        className="novel-editor border-rgray-7 dark mt-5 max-h-[60vh] min-h-[40vh] w-[50vw] overflow-y-auto rounded-lg border bg-white [&>div>div]:p-5"
      />
      <DialogFooter>
        <FilterSpaces
          selectedSpaces={selectedSpacesId}
          setSelectedSpaces={setSelectedSpacesId}
          className="mr-auto bg-white hover:bg-slate-100"
          name={"Spaces"}
        />
        <DeleteConfirmation
          onDelete={() => {
            deleteMemory(memory.id);
            onDelete?.();
          }}
        >
          <button
            type={undefined}
            disabled={loading}
            className="rounded-md px-3 py-2 ring-transparent transition hover:bg-red-100 hover:text-red-400 focus-visible:bg-red-100 focus-visible:text-red-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Trash className="h-5 w-5" />
          </button>
        </DeleteConfirmation>
        <button
          onClick={() => {
            if (check()) {
              setLoading(true);
              console.log({
                title: name === memory.title ? undefined : name,
                content: content === memory.content ? undefined : content,
                spaces: isArraysEqual(initialSpaces, selectedSpacesId)
                  ? undefined
                  : selectedSpacesId,
              });
              updateMemory(memory.id, {
                title: name === memory.title ? undefined : name,
                content: content === memory.content ? undefined : content,
                spaces: isArraysEqual(initialSpaces, selectedSpacesId)
                  ? undefined
                  : selectedSpacesId,
              }).then(closeDialog);
            }
          }}
          disabled={loading}
          className="focus-visible:ring-rgray-7 relative rounded-md bg-white px-4 py-2 ring-transparent transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <motion.div
            initial={{ x: "-50%", y: "-100%" }}
            animate={loading && { y: "-50%", x: "-50%", opacity: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[-100%] opacity-0"
          >
            <Loader className="h-5 w-5 animate-spin" />
          </motion.div>
          <motion.div
            initial={{ y: "0%" }}
            animate={loading && { opacity: 0, y: "30%" }}
          >
            Save
          </motion.div>
        </button>
        <DialogClose
          type={undefined}
          disabled={loading}
          className="focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </DialogClose>
      </DialogFooter>
    </div>
  );
}
