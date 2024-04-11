import { Editor } from "novel";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";
import { FilterCombobox } from "./FilterCombobox";

export function AddMemoryPage() {
  const [selectedSpacesId, setSelectedSpacesId] = useState<number[]>([]);

  return (
    <div className="md:w-[40vw]">
      <DialogHeader>
        <DialogTitle>Add a web page to memory</DialogTitle>
        <DialogDescription>
          This will take you the web page you are trying to add to memory, where
          the extension will save the page to memory
        </DialogDescription>
      </DialogHeader>
      <Label className="mt-5 block">URL</Label>
      <Input
        placeholder="Enter the URL of the page"
        type="url"
        data-modal-autofocus
        className="bg-rgray-4 mt-2 w-full"
      />
      <DialogFooter>
        <FilterCombobox
          selectedSpaces={selectedSpacesId}
          setSelectedSpaces={setSelectedSpacesId}
          className="hover:bg-rgray-5 mr-auto bg-white/5"
          name={"Spaces"}
        />
        <DialogClose
          type={undefined}
          className="bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
          Add
        </DialogClose>
        <DialogClose className="hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
          Cancel
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

export function NoteAddPage({ closeDialog }: { closeDialog: () => void }) {
  const [selectedSpacesId, setSelectedSpacesId] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  function check() {
    const data = {
      name: name.trim(),
      content,
    };
    console.log(name);
    if (!data.name || data.name.length < 1) {
      if (!inputRef.current) {
        alert("Please enter a name for the note");
        return;
      }
      inputRef.current.value = "";
      inputRef.current.placeholder = "Please enter a title for the note";
      inputRef.current.dataset["error"] = "true";
      setTimeout(() => {
        inputRef.current!.placeholder = "Title of the note";
        inputRef.current!.dataset["error"] = "false";
      }, 500);
      inputRef.current.focus();
    }
  }

  return (
    <div>
      <Input
        ref={inputRef}
        data-error="false"
        className="w-full border-none p-0 text-xl ring-0 placeholder:text-white/30 placeholder:transition placeholder:duration-200 focus-visible:ring-0 data-[error=true]:placeholder:text-red-400"
        placeholder="Title of the note"
        data-modal-autofocus
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Editor
        disableLocalStorage
        defaultValue={""}
        onUpdate={(editor) => {
          if (!editor) return;
          setContent(editor.storage.markdown.getMarkdown());
        }}
        extensions={[Markdown]}
        className="novel-editor bg-rgray-4 border-rgray-7 dark mt-5 max-h-[60vh] min-h-[40vh] w-[50vw] overflow-y-auto rounded-lg border [&>div>div]:p-5"
      />
      <DialogFooter>
        <FilterCombobox
          selectedSpaces={selectedSpacesId}
          setSelectedSpaces={setSelectedSpacesId}
          className="hover:bg-rgray-5 mr-auto bg-white/5"
          name={"Spaces"}
        />
        <button
          onClick={() => {
            check();
          }}
          className="bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
          Add
        </button>
        <DialogClose
          type={undefined}
          className="hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
          Cancel
        </DialogClose>
      </DialogFooter>
    </div>
  );
}
