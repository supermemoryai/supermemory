import { createContext } from 'react';

export interface DragContextType {
  isDraggingOver: boolean;
  setIsDraggingOver: React.Dispatch<React.SetStateAction<boolean>>;
}


const DragContext = createContext<DragContextType | undefined>(undefined);

export default DragContext;