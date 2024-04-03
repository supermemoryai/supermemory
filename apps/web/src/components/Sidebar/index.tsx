"use client";
import { StoredContent } from "@/server/db/schema";
import { MemoryIcon } from "../../assets/Memories";
import { Trash2, User2 } from "lucide-react";
import React, { useState } from "react";
import { MemoriesBar } from "./MemoriesBar";

export type MenuItem = {
  icon: React.ReactNode | React.ReactNode[];
  label: string;
  content?: React.FC;
};

const menuItemsTop: Array<MenuItem> = [
  {
    icon: <MemoryIcon className="h-10 w-10" />,
    label: "Memories",
    content: MemoriesBar,
  },
];

const menuItemsBottom: Array<MenuItem> = [
  {
    icon: <Trash2 strokeWidth={1.3} className="h-6 w-6" />,
    label: "Trash",
  },
  {
    icon: <User2 strokeWidth={1.3} className="h-6 w-6" />,
    label: "Profile",
  },
];

export default function Sidebar({
  onSelectChange,
}: {
  onSelectChange?: (selectedItem: string | null) => void;
}) {
  const menuItems = [...menuItemsTop, ...menuItemsBottom];
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  React.useEffect(() => {
    onSelectChange?.(selectedItem);
  }, [selectedItem]);

  const Subbar =
    menuItems.find((i) => i.label === selectedItem)?.content ?? (() => <></>);

  return (
    <>
      <div className="bg-rgray-2 border-r-rgray-6 hidden h-screen max-h-screen w-max flex-col items-center border-r px-2 py-5 text-sm font-light md:flex">
        {menuItemsTop.map((item, index) => (
          <MenuItem
            key={index}
            item={item}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
        ))}
        <div className="mt-auto" />
        {menuItemsBottom.map((item, index) => (
          <MenuItem
            key={index}
            item={item}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
        ))}
      </div>
      {selectedItem && (
        <SubSidebar>
          <Subbar />
        </SubSidebar>
      )}
    </>
  );
}

const MenuItem = ({
  item: { icon, label },
  selectedItem,
  setSelectedItem,
}: {
  item: MenuItem;
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
}) => (
  <button
    data-state-on={selectedItem === label}
    onClick={() => setSelectedItem((prev) => (prev === label ? null : label))}
    className="on:opacity-100 on:bg-rgray-4 focus-visible:ring-rgray-7 flex w-full flex-col items-center justify-center rounded-md px-3 py-3 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
  >
    {icon}
    <span className="">{label}</span>
  </button>
);

export function SubSidebar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-rgray-3 border-r-rgray-6 hidden h-screen w-[50vw] flex-col items-center border-r font-light md:flex">
      {children}
    </div>
  );
}
