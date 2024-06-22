"use client";

import { Canvas } from "../canvas";
import React, { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SettingsIcon, DragIcon } from "@repo/ui/icons";
import DraggableComponentsContainer from "@repo/ui/components/canvas/draggableComponent";
import { AutocompleteIcon, blockIcon } from "@repo/ui/icons";
import Image from "next/image";

function page() {
  const [value, setValue] = useState("");
  const [fullScreen, setFullScreen] = useState(false);
  const [visible, setVisible] = useState(true);

  return (
    <div
      className={`h-screen w-full ${!fullScreen ? "px-4 py-6" : "bg-[#1F2428]"} transition-all`}
    >
      <div>
        <PanelGroup
          onLayout={(l) => {
            l[0]! < 20 ? setVisible(false) : setVisible(true);
          }}
          className={` ${fullScreen ? "w-[calc(100vw-2rem)]" : "w-screen"} transition-all`}
          direction="horizontal"
        >
          <Panel
            onExpand={() => {
              setTimeout(() => setFullScreen(false), 50);
            }}
            onCollapse={() => {
              setTimeout(() => setFullScreen(true), 50);
            }}
            defaultSize={30}
            collapsible={true}
          >
            <div
              className={`flex transition-all rounded-2xl ${fullScreen ? "h-screen" : "h-[calc(100vh-3rem)]"} w-full flex-col overflow-hidden bg-[#1F2428]`}
            >
              <div className="flex items-center justify-between bg-[#2C3439] px-4 py-2 text-lg font-medium text-[#989EA4]">
                Change Filters
                <Image src={SettingsIcon} alt="setting-icon" />
              </div>
              <div className="px-3 py-5">
                <input
                  placeholder="search..."
                  onChange={(e) => {
                    setValue(e.target.value);
                  }}
                  value={value}
                  // rows={1}
                  className="w-full resize-none rounded-xl bg-[#151515] px-3 py-4 text-xl text-[#989EA4] outline-none focus:outline-none sm:max-h-52"
                />
              </div>
              {visible ? (
                <SidePanel />
              ) : (
                <h1 className="text-center py-10 text-xl">Need more space to show!</h1>
              )}
            </div>
          </Panel>
          <PanelResizeHandle
            className={`relative flex items-center transition-all justify-center ${!fullScreen && "px-1"}`}
          >
            {/* <div className="absolute z-[1000000]  top-1/2 -translate-y-1/2"> */}
            <div
              className={`rounded-lg bg-[#2F363B] ${!fullScreen && "px-1"} transition-all py-2`}
            >
              <Image src={DragIcon} alt="drag-icon" />
            </div>
            {/* </div> */}
          </PanelResizeHandle>
          <Panel className="relative" defaultSize={70} minSize={60}>
            <div
              className={`absolute overflow-hidden transition-all inset-0 ${fullScreen ? "h-screen " : "h-[calc(100vh-3rem)] rounded-2xl"} w-full`}
            >
              <Canvas />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

const content= [
  {
    content: "Nvidia currently dominates the GPU hardware market, with a market share over 97%. This has led some to argue...",
    icon: AutocompleteIcon,
    iconAlt: "Autocomplete",
    extraInfo: "Page Url: https://www.cnbc.com/2024/05/23/nvidia-keeps-hitting-records-can-investors-still-buy-the-stock.html?&qsearchterm=nvidia",
  },
  {
    content: "Nvidia currently dominates the GPU hardware market, with a market share over 97%. This has led some to argue...",
    icon: blockIcon,
    iconAlt: "Autocomplete",
    extraInfo: "Page Url: https://www.cnbc.com/2024/05/23/nvidia-keeps-hitting-records-can-investors-still-buy-the-stock.html?&qsearchterm=nvidia",
  },

]

function SidePanel(){
  return (
    <DraggableComponentsContainer content={content} />
  )
}

export default page;
