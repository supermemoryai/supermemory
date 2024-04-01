"use server";
import { StoredContent } from "@/server/db/schema";
import { AddNewPagePopover, PageItem } from "./PagesItem";

export default async function Sidebar() {
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
    <aside className="bg-rgray-3 flex h-screen w-[25%] flex-col items-start justify-between py-5 pb-[50vh] font-light">
      <div className="flex items-center justify-center gap-1 px-5 text-xl font-normal">
        <img src="/brain.png" alt="logo" className="h-10 w-10" />
        SuperMemory
      </div>
      <div className="flex w-full flex-col items-start justify-center p-2">
        <h1 className="mb-1 flex w-full items-center justify-center px-3 font-normal">
          Pages
          <AddNewPagePopover />
        </h1>
        {pages.map((item) => (
          <PageItem key={item.id} item={item} />
        ))}
      </div>
    </aside>
  );
}
