"use client";
import { StoredContent } from "@/server/db/schema";
import { MemoryIcon } from "../../assets/Memories";
import { Trash2, User2 } from "lucide-react";
import React, { useState } from "react";

export type MenuItem = {
  icon: React.ReactNode | React.ReactNode[];
  label: string;
};

const menuItemsTop: Array<MenuItem> = [
  {
    icon: <MemoryIcon className="h-10 w-10" />,
    label: "Memories",
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
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  React.useEffect(() => {
    onSelectChange?.(selectedItem);
  }, [selectedItem]);

  return (
    <>
      <aside className="bg-rgray-2 border-rgray-6 flex h-screen max-h-screen w-max flex-col items-center border-r px-2 py-5 text-sm font-light">
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
      </aside>
      {selectedItem && <SubSidebar />}
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

export function SubSidebar() {
  const pages: StoredContent[] = [
    {
      id: 1,
      content: "",
      title: "Visual Studio Code",
      url: "https://code.visualstudio.com",
      description: "",
      image: "https://code.visualstudio.com/favicon.ico",
      baseUrl: "https://code.visualstudio.com",
      savedAt: new Date(),
    },
    {
      id: 2,
      content: "",
      title: "yxshv/vscode: An unofficial remake of vscode's landing page",
      url: "https://github.com/yxshv/vscode",
      description: "",
      image: "https://github.com/favicon.ico",
      baseUrl: "https://github.com",
      savedAt: new Date(),
    },
  ];

  return (
    <aside className="bg-rgray-3 border-rgray-6 flex h-screen w-[50vw] flex-col items-center border-r px-3 py-5 font-light"></aside>
  );
}
