import Image from "next/image";
import { useRef, useState } from "react";

interface DraggableComponentsProps {
  content: string;
  extraInfo?: string;
  icon: string;
  iconAlt: string;
}

export default function DraggableComponentsContainer({
  content,
}: {
  content: DraggableComponentsProps[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {content.map((i) => {
        return (
          <DraggableComponents
            content={i.content}
            icon={i.icon}
            iconAlt={i.iconAlt}
            extraInfo={i.extraInfo}
          />
        );
      })}
    </div>
  );
}

function DraggableComponents({
  content,
  extraInfo,
  icon,
  iconAlt,
}: DraggableComponentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    if (containerRef.current) {
      // Serialize the children as a string for dataTransfer
      const childrenHtml = containerRef.current.innerHTML;
      event.dataTransfer.setData("text/html", childrenHtml);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      draggable
      className={`flex gap-4 px-1 rounded-md text-[#989EA4] border-2 transition ${isDragging ? "border-blue-600" : "border-[#1F2428]"}`}
    >
      <Image className="select-none" src={icon} alt={iconAlt} />
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="line-clamp-3">{content}</h1>
        </div>
        <p className="line-clamp-1 text-[#369DFD]">{extraInfo}</p>
      </div>
    </div>
  );
}
