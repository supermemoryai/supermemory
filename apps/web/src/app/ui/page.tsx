"use client";
import Main from "@/components/Main";
import Sidebar from "@/components/Sidebar/index";
import { useState } from "react";

export default function Home() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <div className="flex w-screen">
      <Sidebar onSelectChange={setSelectedItem} />
      <Main sidebarOpen={selectedItem !== null} />
    </div>
  );
}
