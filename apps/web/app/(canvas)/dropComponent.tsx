import React, { useRef, useCallback, useEffect, useContext } from "react";
import { useEditor } from "tldraw";
import DragContext, { DragContextType } from "./lib/context";
import { handleExternalDroppedContent } from "./lib/createEmbeds";

const stripHtmlTags = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

const useDrag = (): DragContextType => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useCounter must be used within a CounterProvider");
  }
  return context;
};

function DropZone() {
  const dropRef = useRef<HTMLDivElement | null>(null);
  const { isDraggingOver, setIsDraggingOver } = useDrag();

  const editor = useEditor();

  const handleDragLeave = () => {
    setIsDraggingOver(false);
    console.log("leaver");
  };

  const handleDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const dt = event.dataTransfer;
    if (!dt) {return}
    const items = dt.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i]!.kind === "file" && items[i]!.type.startsWith("image/")) {
        const file = items[i]!.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target) {
              // setDroppedImage(e.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      } else if (items[i]!.kind === "string") {
        items[i]!.getAsString((data) => {
          const cleanText = stripHtmlTags(data);
          handleExternalDroppedContent({ editor, text: cleanText });
        });
      }
    }
  }, []);

  useEffect(() => {
    const divElement = dropRef.current;
    if (divElement) {
      divElement.addEventListener("drop", handleDrop);
      divElement.addEventListener("dragleave", handleDragLeave);
    }
    return () => {
      if (divElement) {
        divElement.removeEventListener("drop", handleDrop);
        divElement.addEventListener("dragleave", handleDragLeave);
      }
    };
  }, []);

  return (
    <div
      className={`h-full w-full absolute top-0 left-0 z-[100000] pointer-events-none  ${isDraggingOver && "bg-[#2C3439]  pointer-events-auto"}`}
      ref={dropRef}
    ></div>
  );
}

export default DropZone;
