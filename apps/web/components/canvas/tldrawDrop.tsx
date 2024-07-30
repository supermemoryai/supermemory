import { handleExternalDroppedContent } from "@/lib/ExternalDroppedContent";
import {
	BomttomLeftIcon,
	BomttomRightIcon,
	TopLeftIcon,
	TopRightIcon,
} from "@repo/ui/icons";
import Image from "next/image";
import { useContext } from "react";
import { useEditor } from "tldraw";
import { DragContext } from "./tldrawComponent";

type CardData = {
	title: string;
	type: string;
	content: string;
	text: boolean;
};

function DropZone() {
	const editor = useEditor();

	const dragContext = useContext(DragContext);
	if (!dragContext) {
		throw new Error("Thinkpad must be used within a DragContextProvider");
	}
	const { isDraggingOver, setIsDraggingOver } = dragContext;

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		const data = event.dataTransfer.getData("application/json");
		try {
			const cardData: CardData = JSON.parse(data);
			console.log("drop", cardData);
			handleExternalDroppedContent({ editor, droppedData: cardData });
		} catch (e) {
			const textData = event.dataTransfer.getData("text/plain");
			handleExternalDroppedContent({ editor, droppedData: textData });
		}
		setIsDraggingOver(false);
	};

	return (
		<div
			onDrop={handleDrop}
			onDragOver={(e) => e.preventDefault()}
			onDragLeave={() => setIsDraggingOver(false)}
			className={`w-full absolute ${
				isDraggingOver ? "z-[500]" : "z-[100] pointer-events-none"
			}  rounded-lg h-full flex items-center justify-center`}
		>
			{isDraggingOver && (
				<>
					<div className="absolute top-4 left-8">
						<Image src={TopRightIcon} alt="" />
					</div>
					<div className="absolute top-4 right-8">
						<Image src={TopLeftIcon} alt="" />
					</div>
					<div className="absolute bottom-4 left-8">
						<Image src={BomttomLeftIcon} alt="" />
					</div>
					<div className="absolute bottom-4 right-8">
						<Image src={BomttomRightIcon} alt="" />
					</div>
				</>
			)}
		</div>
	);
}

export default DropZone;
