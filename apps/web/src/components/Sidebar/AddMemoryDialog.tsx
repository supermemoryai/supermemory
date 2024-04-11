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
import { useRef } from "react";

export function AddMemoryPage() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a web page to memory</DialogTitle>
        <DialogDescription>
          This will take you the web page you are trying to add to memory, where
          the extension will save the page to memory
        </DialogDescription>
      </DialogHeader>
      <Label className="mt-5">URL</Label>
      <Input
        placeholder="Enter the URL of the page"
        type="url"
        data-modal-autofocus
        className="bg-rgray-4 mt-2 w-full"
      />
      <DialogFooter>
        <DialogClose className="bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
          Add
        </DialogClose>
        <DialogClose className="hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
          Cancel
        </DialogClose>
      </DialogFooter>
    </>
  );
}

export function NoteAddPage() {
  return (
    <>
      <Input
        className="w-full border-none p-0 text-xl ring-0 placeholder:text-white/30 focus-visible:ring-0"
        placeholder="Name of the note"
        data-modal-autofocus
      />
      <Editor
        disableLocalStorage
        className="novel-editor bg-rgray-4 border-rgray-7 dark mt-5 max-h-[60vh] min-h-[40vh] w-[50vw] overflow-y-auto rounded-lg border [&>div>div]:p-5"
      />
      <DialogFooter>
        <DialogClose className="bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
          Add
        </DialogClose>
        <DialogClose className="hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
          Cancel
        </DialogClose>
      </DialogFooter>
    </>
  );
}
