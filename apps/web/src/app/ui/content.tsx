"use client";
import Main from "@/components/Main";
import Sidebar from "@/components/Sidebar/index";
import { useState } from "react";

export default function Content() {
  const [selectedItem, setSelectedItem] = useState<string | null>();

  return (
    <div className="flex w-screen">
      <Sidebar onSelectChange={setSelectedItem} />
      <Main sidebarOpen={selectedItem !== null} />
    </div>
  );
}
