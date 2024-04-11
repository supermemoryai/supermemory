import { useEffect, useRef } from "react";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export default function AddMemoryPage() {
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
        data-autofocus
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
