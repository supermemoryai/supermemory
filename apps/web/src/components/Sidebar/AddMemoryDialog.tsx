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
import { FilterMemories, FilterSpaces } from "./FilterCombobox";
import { useMemory } from "@/contexts/MemoryContext";
import { Loader, Plus, X } from "lucide-react";
import { StoredContent } from "@/server/db/schema";
import { cleanUrl } from "@/lib/utils";
import { motion } from "framer-motion"
import { getMetaData } from "@/server/helpers";

export function AddMemoryPage({ closeDialog }: { closeDialog: () => void }) {
  const { addMemory } = useMemory();

  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedSpacesId, setSelectedSpacesId] = useState<number[]>([]);

  return (
    <form className="md:w-[40vw]">
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
        className="disabled:opacity-70 disabled:cursor-not-allowed bg-rgray-4 mt-2 w-full"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
				disabled={loading}
      />
      <DialogFooter>
        <FilterSpaces
          selectedSpaces={selectedSpacesId}
          setSelectedSpaces={setSelectedSpacesId}
          className="disabled:opacity-70 disabled:cursor-not-allowed hover:bg-rgray-5 mr-auto bg-white/5"
          name={"Spaces"}
					disabled={loading}
        />
        <button
          type={"submit"}
					disabled={loading}
          onClick={async () => {
						setLoading(true)
						const metadata = await getMetaData(url)
            await addMemory(
              {
                title: metadata.title,
								description: metadata.description,
                content: "",
                type: "page",
                url: url,
                image: metadata.image,
                savedAt: new Date(),
              },
              selectedSpacesId,
            );
						closeDialog()
          }}
          className="relative disabled:opacity-70 disabled:cursor-not-allowed bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
					<motion.div 
						initial={{ x: '-50%', y: '-100%' }}
						animate={loading && { y: '-50%', x: '-50%', opacity: 1 }}
						className="opacity-0 absolute top-1/2 left-1/2 translate-y-[-100%] -translate-x-1/2"
					>
						<Loader className="w-5 h-5 animate-spin text-rgray-11" />
					</motion.div>
					<motion.div
						initial={{ y: '0%' }}
						animate={loading && { opacity: 0, y: '30%' }}
					>
						Add
					</motion.div>
        </button>
        <DialogClose
					disabled={loading}
					className="disabled:opacity-70 disabled:cursor-not-allowed hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
				>
          Cancel
        </DialogClose>
      </DialogFooter>
    </form>
  );
}

export function NoteAddPage({ closeDialog }: { closeDialog: () => void }) {
	
	const { addMemory } = useMemory()

  const [selectedSpacesId, setSelectedSpacesId] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
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

  return (
    <div>
      <Input
        ref={inputRef}
        data-error="false"
        className="w-full border-none p-0 text-xl ring-0 placeholder:text-white/30 placeholder:transition placeholder:duration-500 focus-visible:ring-0 data-[error=true]:placeholder:text-red-400"
        placeholder="Title of the note"
        data-modal-autofocus
        value={name}
				disabled={loading}
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
        <FilterSpaces
          selectedSpaces={selectedSpacesId}
          setSelectedSpaces={setSelectedSpacesId}
          className="hover:bg-rgray-5 mr-auto bg-white/5"
          name={"Spaces"}
        />
        <button
          onClick={() => {
            if (check()) {
							setLoading(true)
							addMemory({
								content,
								title: name,
								type: "note",
								url: "https://notes.supermemory.dhr.wtf/",
								image: '',
								savedAt: new Date()
							}, selectedSpacesId).then(closeDialog)
            }
          }}
					disabled={loading}
          className="relative disabled:opacity-70 disabled:cursor-not-allowed bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
					
					<motion.div 
						initial={{ x: '-50%', y: '-100%' }}
						animate={loading && { y: '-50%', x: '-50%', opacity: 1 }}
						className="opacity-0 absolute top-1/2 left-1/2 translate-y-[-100%] -translate-x-1/2"
					>
						<Loader className="w-5 h-5 animate-spin text-rgray-11" />
					</motion.div>
					<motion.div
						initial={{ y: '0%' }}
						animate={loading && { opacity: 0, y: '30%' }}
					>
						Add
					</motion.div>
        </button>
        <DialogClose
          type={undefined}
					disabled={loading}
          className="disabled:opacity-70 disabled:cursor-not-allowed hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
          Cancel
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

export function SpaceAddPage({ closeDialog }: { closeDialog: () => void }) {

	const { addSpace } = useMemory()

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);

	const [selected, setSelected] = useState<StoredContent[]>([]);


  function check(): boolean {
    const data = {
      name: name.trim(),
    };
    if (!data.name || data.name.length < 1) {
      if (!inputRef.current) {
        alert("Please enter a name for the note");
        return false;
      }
      inputRef.current.value = "";
      inputRef.current.placeholder = "Please enter a title for the space";
      inputRef.current.dataset["error"] = "true";
      setTimeout(() => {
        inputRef.current!.placeholder = "Enter the name of the space";
        inputRef.current!.dataset["error"] = "false";
      }, 500);
      inputRef.current.focus();
      return false;
    }
    return true;
  }

  return (
    <div className="md:w-[40vw]">
      <DialogHeader>
        <DialogTitle>Add a space</DialogTitle>
      </DialogHeader>
      <Label className="mt-5 block">Name</Label>
      <Input
				ref={inputRef}
        placeholder="Enter the name of the space"
        type="url"
        data-modal-autofocus
				value={name}
				disabled={loading}
				onChange={e => setName(e.target.value)}
        className="bg-rgray-4 mt-2 w-full focus-visible:data-[error=true]:ring-red-500/10 data-[error=true]:placeholder:text-red-400 placeholder:transition placeholder:duration-500"
      />
      {selected.length > 0 && (
				<>
					<Label className="mt-5 block">Add Memories</Label>
					<div className="flex min-h-5 py-2 flex-col justify-center items-center">
						{selected.map(i => (
							<MemorySelectedItem
								key={i.id}
								onRemove={() => setSelected(prev => prev.filter(p => p.id !== i.id))}
								{...i}
							/>
						))}
					</div>
				</>
			)}
      <DialogFooter>
				<FilterMemories
					selected={selected}
					setSelected={setSelected}
					disabled={loading}
					className="mr-auto bg-white/5 hover:bg-rgray-4 focus-visible:bg-rgray-4 disabled:opacity-70 disabled:cursor-not-allowed"
				>
					<Plus className="w-5 h-5" />
					Memory
				</FilterMemories>
        <button
          type={undefined}
					onClick={() => {
						if (check()) {
							setLoading(true)
							addSpace(name, selected.map(s => s.id)).then(() => closeDialog())
						}
					}}
					disabled={loading}
          className="relative disabled:opacity-70 disabled:cursor-not-allowed bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2"
        >
					<motion.div 
						initial={{ x: '-50%', y: '-100%' }}
						animate={loading && { y: '-50%', x: '-50%', opacity: 1 }}
						className="opacity-0 absolute top-1/2 left-1/2 translate-y-[-100%] -translate-x-1/2"
					>
						<Loader className="w-5 h-5 animate-spin text-rgray-11" />
					</motion.div>
					<motion.div
						initial={{ y: '0%' }}
						animate={loading && { opacity: 0, y: '30%' }}
					>
						Add
					</motion.div>
        </button>
        <DialogClose disabled={loading} className="disabled:opacity-70 disabled:cursor-not-allowed hover:bg-rgray-4 focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 rounded-md px-3 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
          Cancel
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

export function MemorySelectedItem({ id, title, url, type, image, onRemove }: StoredContent & { onRemove: () => void; }) {
	return (
		<div className="flex justify-start gap-2 p-1 px-2 w-full items-center text-sm rounded-md hover:bg-rgray-4 focus-within-bg-rgray-4 [&:hover>[data-icon]]:block [&:hover>img]:hidden">
			<img src={type === 'note'? '/note.svg' : image ?? "/icons/logo_without_bg.png"} className="h-5 w-5" />
			<button onClick={onRemove} data-icon className="w-5 h-5 p-0 m-0 hidden focus-visible:outline-none">
				<X className="w-5 h-5 scale-90" />
			</button>
			<span>{title}</span>
			<span className="ml-auto block opacity-50">{type ==='note' ? 'Note' : cleanUrl(url)}</span>
		</div>
	)
}
