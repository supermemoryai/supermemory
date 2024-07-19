import Image from "next/image";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

export default function DraggableComponentsContainer({
	content,
}: {
	content: { context: string }[] | undefined;
}) {
	if (content === undefined) return null;
	return (
		<div className="flex flex-col gap-10">
			{content.map((i) => {
				return <DraggableComponents content={i.context} />;
			})}
		</div>
	);
}

function DraggableComponents({ content }: { content: string }) {
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
		<motion.div
			initial={{ opacity: 0, y: 5 }}
			animate={{ opacity: 1, y: 0 }}
			ref={containerRef}
			onDragEnd={handleDragEnd}
			// @ts-expect-error TODO: fix this
			onDragStart={handleDragStart}
			draggable
			className={`flex gap-4 px-3 overflow-hidden rounded-md text-[#989EA4] border-2 transition ${isDragging ? "border-blue-600" : "border-[#1F2428]"}`}
		>
			<div className="flex flex-col gap-2">
				<div>
					<h1 className="line-clamp-3">{content}</h1>
				</div>
				{/* <p className="line-clamp-1 text-[#369DFD]">{extraInfo}</p> */}
			</div>
		</motion.div>
	);
}
