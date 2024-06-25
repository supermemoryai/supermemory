"use client";

import { Canvas } from "@repo/ui/components/canvas/components/canvas";
import React, { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SettingsIcon, DragIcon } from "@repo/ui/icons";
import DraggableComponentsContainer from "@repo/ui/components/canvas/components/draggableComponent";
import { AutocompleteIcon, blockIcon } from "@repo/ui/icons";
import Image from "next/image";
import { Switch } from "@repo/ui/shadcn/switch";
import { Label } from "@repo/ui/shadcn/label";
import { useRouter } from "next/router";

function page() {
  const [fullScreen, setFullScreen] = useState(false);
  const [visible, setVisible] = useState(true);

  const router = useRouter();
  router.push("/home");

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
              {visible ? (
                <SidePanel />
              ) : (
                <h1 className="text-center py-10 text-xl">
                  Need more space to show!
                </h1>
              )}
            </div>
          </Panel>
          <PanelResizeHandle
            className={`relative flex items-center transition-all justify-center ${!fullScreen && "px-1"}`}
          >
            <div
              className={`rounded-lg bg-[#2F363B] ${!fullScreen && "px-1"} transition-all py-2`}
            >
              <Image src={DragIcon} alt="drag-icon" />
            </div>
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

function SidePanel() {
  const [value, setValue] = useState("");
  const [dragAsText, setDragAsText] = useState(false);
  return (
    <>
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
      <div className="flex items-center justify-end px-3 py-4">
        <Switch
          className="bg-[#151515] data-[state=unchecked]:bg-red-400 data-[state=checked]:bg-blue-400"
          onCheckedChange={(e) => setDragAsText(e)}
          id="drag-text-mode"
        />
        <Label htmlFor="drag-text-mode">Drag as Text</Label>
      </div>
      <DraggableComponentsContainer content={content} />
    </>
  );
}

export default page;

const content = [
  {
    content:
      "Regional growth patterns diverge, with strong performance in the United States and several emerging markets, contrasted by weaker prospects in many advanced economies, particularly in Europe (World Economic Forum) (OECD). The rapid adoption of artificial intelligence (AI) is expected to drive productivity growth, especially in advanced economies, potentially mitigating labor shortages and boosting income levels in emerging markets (World Economic Forum) (OECD). However, ongoing geopolitical tensions and economic fragmentation are likely to maintain a level of uncertainty and volatility in the global economy (World Economic Forum.",
    icon: AutocompleteIcon,
    iconAlt: "Autocomplete",
    extraInfo:
      "Page Url: https://chatgpt.com/c/762cd44e-1752-495b-967a-aa3c23c6024a",
  },
  {
    content:
      "As of mid-2024, the global economy is experiencing modest growth with significant regional disparities. Global GDP growth is projected to be around 3.1% in 2024, rising slightly to 3.2% in 2025. This performance, although below the pre-pandemic average, reflects resilience despite various economic pressures, including tight monetary conditions and geopolitical tensions (IMF)(OECD) Inflation is moderating faster than expected, with global headline inflation projected to fall to 5.8% in 2024 and 4.4% in 2025, contributing to improving real incomes and positive trade growth (IMF) (OECD)",
    icon: blockIcon,
    iconAlt: "Autocomplete",
    extraInfo:
      "Page Url: https://www.cnbc.com/2024/05/23/nvidia-keeps-hitting-records-can-investors-still-buy-the-stock.html?&qsearchterm=nvidia",
  },
];
