"use client";

// import Canvas from "./_components/canvas";
import Canvas from "../canvas";
import React, { useState } from "react";
// import ReactTextareaAutosize from "react-textarea-autosize";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  DragSvg,
  SettingsSvg,
  LinkSvg,
  ThreeDBlock,
  TextLoadingSvg,
} from "../svg";

function page() {
  const [value, setValue] = useState("");
  const [fullScreen, setFullScreen] = useState(false);

  return (
    <div className={`h-screen w-full ${ !fullScreen && "px-4 py-6"} transition-all`}>
      <div>
        <PanelGroup className={` ${fullScreen ? "w-[calc(100vw-2rem)]" : "w-screen"} transition-all`} direction="horizontal">
          <Panel onExpand={()=> {setFullScreen(false)}} onCollapse={()=> {setFullScreen(true)}} defaultSize={30} collapsible={true} minSize={22}>
            <div className={`flex transition-all rounded-2xl ${fullScreen ? "h-screen": "h-[calc(100vh-3rem)]"} w-full flex-col overflow-hidden bg-[#1F2428]`}>
              <div className="flex items-center justify-between bg-[#2C3439] px-4 py-2 text-lg font-medium text-[#989EA4]">
                Change Filters
                <SettingsSvg />
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
              <div className="flex flex-col gap-10">
                <div className="flex gap-4 px-3 text-[#989EA4]">
                  <TextLoadingSvg />
                  <h1>
                    Nvidia will most likely create monopoly in software industry
                    as they are already largest player in GPU hardware by 20...
                  </h1>
                </div>
                <div className="flex gap-4 px-3 text-[#989EA4]">
                  <ThreeDBlock />
                  <div className="flex flex-col gap-2">
                    <div>
                      <h1 className="line-clamp-3">
                        Nvidia currently dominates the GPU hardware market, with
                        a market share over 97%. This has led some to argue...
                      </h1>
                    </div>
                    <p className="line-clamp-1 text-[#369DFD]">
                      From space: GPU GOATS
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 px-3 text-[#989EA4]">
                  <LinkSvg />
                  <div className="flex flex-col gap-2">
                    <div>
                      <h1 className="line-clamp-3">
                        Nvidia currently dominates the GPU hardware market, with
                        a market share over 97%. This has led some to argue...
                      </h1>
                    </div>
                    <p className="line-clamp-1 text-[#369DFD]">
                      Page url:
                      https://www.cnbc.com/2024/05/23/nvidia-keeps-hitting-records-can-investors-still-buy-the-stock.html?&qsearchterm=nvidia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className={`relative flex items-center transition-all justify-center ${!fullScreen && "px-1"}`}>
            {/* <div className="absolute z-[1000000]  top-1/2 -translate-y-1/2"> */}
            <div className={`rounded-lg bg-[#2F363B] ${!fullScreen && "px-1"} transition-all py-2`}>
              <DragSvg />
            </div>
            {/* </div> */}
          </PanelResizeHandle>
          <Panel className="relative" defaultSize={70} minSize={60}>
            <div className={`absolute overflow-hidden transition-all inset-0 ${ fullScreen ? "h-screen " : "h-[calc(100vh-3rem)] rounded-2xl"} w-full`}>
              <Canvas />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default page;
