"use client";

import { Canvas } from "./canvas";
import React, { createContext, useContext, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SettingsIcon, DragIcon } from "@repo/ui/icons";
import DraggableComponentsContainer from "./draggableComponent";
import Image from "next/image";
import { Label } from "@repo/ui/shadcn/label";

interface RectContextType {
	fullScreen: boolean;
	setFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
	visible: boolean;
	setVisible: React.Dispatch<React.SetStateAction<boolean>>;
	id: string;
}

const RectContext = createContext<RectContextType | undefined>(undefined);

export const RectProvider = ({
	id,
	children,
}: {
	id: string;
	children: React.ReactNode;
}) => {
	const [fullScreen, setFullScreen] = useState(false);
	const [visible, setVisible] = useState(true);

	const value = {
		id,
		fullScreen,
		setFullScreen,
		visible,
		setVisible,
	};

	return <RectContext.Provider value={value}>{children}</RectContext.Provider>;
};

export const useRect = () => {
	const context = useContext(RectContext);
	if (context === undefined) {
		throw new Error("useRect must be used within a RectProvider");
	}
	return context;
};

export function ResizaleLayout() {
	const { setVisible, fullScreen, setFullScreen } = useRect();

	return (
		<div
			className={`h-screen w-full ${!fullScreen ? "px-4 py-6" : "bg-[#1F2428]"} transition-all`}
		>
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
					<SidePanelContainer />
				</Panel>
				<PanelResizeHandle
					className={`relative flex items-center transition-all justify-center ${!fullScreen && "px-1"}`}
				>
					<DragIconContainer />
				</PanelResizeHandle>
				<Panel className="relative" defaultSize={70} minSize={60}>
					<CanvasContainer />
				</Panel>
			</PanelGroup>
		</div>
	);
}

function DragIconContainer() {
	const { fullScreen } = useRect();
	return (
		<div
			className={`rounded-lg bg-[#2F363B] ${!fullScreen && "px-1"} transition-all py-2`}
		>
			<Image src={DragIcon} alt="drag-icon" />
		</div>
	);
}

function CanvasContainer() {
	const { fullScreen } = useRect();
	return (
		<div
			className={`absolute overflow-hidden transition-all inset-0 ${fullScreen ? "h-screen " : "h-[calc(100vh-3rem)] rounded-2xl"} w-full`}
		>
			<Canvas />
		</div>
	);
}

function SidePanelContainer() {
	const { fullScreen, visible } = useRect();
	return (
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
				<h1 className="text-center py-10 text-xl">Need more space to show!</h1>
			)}
		</div>
	);
}

function SidePanel() {
	const [content, setContent] = useState<{ context: string }[]>();
	return (
		<>
			<div className="px-3 py-5">
				<form
					action={async (FormData) => {
						const search = FormData.get("search");
						console.log(search);
						const res = await fetch("/api/canvasai", {
							method: "POST",
							body: JSON.stringify({ query: search }),
						});
						const t = await res.json();
						// @ts-expect-error TODO: fix this
						console.log(t.response.response);
						// @ts-expect-error TODO: fix this
						setContent(t.response.response);
					}}
				>
					<input
						placeholder="search..."
						name="search"
						className="w-full resize-none rounded-xl bg-[#151515] px-3 py-4 text-xl text-[#989EA4] outline-none focus:outline-none sm:max-h-52"
					/>
				</form>
			</div>
			<DraggableComponentsContainer content={content} />
		</>
	);
}

const content = [
	{
		content:
			"Regional growth patterns diverge, with strong performance in the United States and several emerging markets, contrasted by weaker prospects in many advanced economies, particularly in Europe (World Economic Forum) (OECD). The rapid adoption of artificial intelligence (AI) is expected to drive productivity growth, especially in advanced economies, potentially mitigating labor shortages and boosting income levels in emerging markets (World Economic Forum) (OECD). However, ongoing geopolitical tensions and economic fragmentation are likely to maintain a level of uncertainty and volatility in the global economy (World Economic Forum.",
		iconAlt: "Autocomplete",
		extraInfo:
			"Page Url: https://chatgpt.com/c/762cd44e-1752-495b-967a-aa3c23c6024a",
	},
	{
		content:
			"As of mid-2024, the global economy is experiencing modest growth with significant regional disparities. Global GDP growth is projected to be around 3.1% in 2024, rising slightly to 3.2% in 2025. This performance, although below the pre-pandemic average, reflects resilience despite various economic pressures, including tight monetary conditions and geopolitical tensions (IMF)(OECD) Inflation is moderating faster than expected, with global headline inflation projected to fall to 5.8% in 2024 and 4.4% in 2025, contributing to improving real incomes and positive trade growth (IMF) (OECD)",
		iconAlt: "Autocomplete",
		extraInfo:
			"Page Url: https://www.cnbc.com/2024/05/23/nvidia-keeps-hitting-records-can-investors-still-buy-the-stock.html?&qsearchterm=nvidia",
	},
];
