import { createContext, useContext } from "react";

export interface DragContextType {
	isDraggingOver: boolean;
	setIsDraggingOver: React.Dispatch<React.SetStateAction<boolean>>;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const useDragContext = () => {
	const context = useContext(DragContext);
	if (context === undefined) {
		throw new Error("useAppContext must be used within an AppProvider");
	}
	return context;
};

export default DragContext;
