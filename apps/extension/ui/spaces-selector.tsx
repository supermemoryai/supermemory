import { useSpaces } from "./hooks/use-spaces";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SpacesSelectorProps {
  onSelecting?: (isSelecting: boolean) => void;
  onSpacesChange?: (spaces: any[]) => void;
  passRef?: React.RefObject<HTMLDivElement>;
}

export default function SpacesSelector({
  onSelecting,
  onSpacesChange,
  passRef,
}: SpacesSelectorProps) {
  const { spaces } = useSpaces();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSpaces, setSelectedSpaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  const toggleSpace = (space: any) => {
    const isSelected = selectedSpaces.some((s) => s.id === space.id);
    const newSelectedSpaces = isSelected
      ? selectedSpaces.filter((s) => s.id !== space.id)
      : [...selectedSpaces, space];

    setSelectedSpaces(newSelectedSpaces);
    onSpacesChange?.(newSelectedSpaces);
  };

  const removeSpace = (spaceId: string) => {
    const newSelectedSpaces = selectedSpaces.filter((s) => s.id !== spaceId);
    setSelectedSpaces(newSelectedSpaces);
    onSpacesChange?.(newSelectedSpaces);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Get the shadow root
      const shadowRoot = dropdownRef.current?.getRootNode() as ShadowRoot;
      const target = event.composedPath()[0] as Node;

      // Check if click is inside either the trigger or dropdown content
      const isInsideTrigger = dropdownRef.current?.contains(target);
      const isInsideDropdown = dropdownContentRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
        onSelecting?.(false);
      }
    };

    // Listen on the window to catch all clicks, including those in shadow DOM
    window.addEventListener("click", handleClickOutside, true);
    return () => {
      window.removeEventListener("click", handleClickOutside, true);
      // cleanup all states
      setIsOpen(false);
      setSelectedSpaces([]);
      setSearchQuery("");
    };
  }, [onSelecting]);

  const filteredSpaces = spaces?.filter((space) =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    onSelecting?.(!isOpen);
  };

  return (
    <div ref={passRef} className="flex-1 space-y-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-150",
            "bg-white/10 hover:bg-white/20 text-white",
            isOpen && "bg-white/20",
            "justify-between"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="max-w-[200px] truncate">
              {selectedSpaces.length === 0 && "Select spaces to save to..."}
              {selectedSpaces.length === 1 && selectedSpaces[0].name}
              {selectedSpaces.length > 1 &&
                `${selectedSpaces.length} spaces selected`}
            </span>
          </div>
          <svg
            className={cn(
              "w-4 h-4 opacity-60 transition-transform duration-200",
              isOpen && "transform rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            ref={dropdownContentRef}
            className="absolute left-0 right-0 top-full mt-1 bg-gray-900 rounded-md shadow-lg border border-white/20 py-1 z-50"
          >
            <div className="px-2 py-1.5">
              <input
                type="text"
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-gray-800 rounded border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="max-h-[240px] overflow-y-auto">
              {filteredSpaces?.length === 0 && (
                <div className="px-3 py-2 text-sm text-white/70">
                  No spaces found
                </div>
              )}

              {filteredSpaces?.map((space) => {
                const isSelected = selectedSpaces.some(
                  (s) => s.id === space.id
                );
                return (
                  <button
                    key={space.id}
                    onClick={() => toggleSpace(space)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                      "text-white hover:bg-gray-800",
                      isSelected && "bg-gray-800"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-white/50"
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">{space.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedSpaces.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedSpaces.map((space) => (
            <div
              key={space.id}
              className="group flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-sm bg-blue-400" />
              <span className="text-blue-100">{space.name}</span>
              <button
                onClick={() => removeSpace(space.id)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
