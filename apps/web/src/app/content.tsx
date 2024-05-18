"use client";
import SessionProviderWrapper from "@/components/dev/SessionProviderWrapper";
import Main from "@/components/Main";
import Sidebar from "@/components/Sidebar/index";
import { useState } from "react";

export default function Content({ jwt }: { jwt: string }) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <SessionProviderWrapper>
      <div className="flex w-screen">
        <Sidebar jwt={jwt} selectChange={setSelectedItem} />
        <Main sidebarOpen={selectedItem !== null} />
      </div>
    </SessionProviderWrapper>
  );
}
