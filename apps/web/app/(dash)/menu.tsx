import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MemoriesIcon, CanvasIcon, AddIcon } from "@repo/ui/icons";
import { DialogTrigger } from "@repo/ui/shadcn/dialog";

import { HomeIcon } from "@heroicons/react/24/solid";
import {
	PencilSquareIcon,
	PlusIcon,
	PresentationChartLineIcon,
	RectangleStackIcon,
} from "@heroicons/react/24/solid";
import DialogTriggerWrapper, {
	DialogDesktopTrigger,
	DialogMobileTrigger,
} from "./dialogTriggerWrapper";

const menuItems = [
	{
		icon: MemoriesIcon,
		text: "Memories",
		url: "/memories",
		disabled: false,
	},
	{
		icon: CanvasIcon,
		text: "Canvas",
		url: "/canvas",
		disabled: true,
	},
];

const items = [
	{
		icon: <HomeIcon className="h-6 w-6" />,
		name: "home",
		url: "/home",
		disabled: false,
	},
	{
		icon: <RectangleStackIcon className="h-6 w-6" />,
		name: "memories",
		url: "/memories",
		disabled: false,
	},
	{
		icon: <PencilSquareIcon className="h-6 w-6" />,
		name: "editor",
		url: "/#",
		disabled: true,
	},
	{
		icon: <PresentationChartLineIcon className="h-6 w-6" />,
		name: "thinkpad",
		url: "/#",
		disabled: true,
	},
];

function Menu() {
	return (
		<>
			{/* Desktop Menu */}
			<div className="hidden lg:flex items-center pointer-events-none z-[39] fixed left-2 top-0 h-screen flex-col justify-center px-2">
				<div className="pointer-events-none z-10 absolute top-1/2 h-1/3 w-full -translate-y-1/2 bg-secondary blur-[300px] "></div>
				<div className="pointer-events-auto flex flex-col gap-2">
					<DialogDesktopTrigger />
					<div className="inline-flex w-14 flex-col items-start gap-6 rounded-2xl border-[1px] border-gray-700/50 bg-secondary px-3 py-4 text-[#b9b9b9] shadow-md shadow-[#1d1d1dc7]">
						{items.map((v) => (
							<NavItem {...v} />
						))}
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			<div className="lg:hidden fixed bottom-0 left-0 w-full p-4 bg-secondary z-50 border-t-2 border-border">
				<div className="flex justify-around items-center">
					<Link
						href={"/"}
						className={`flex flex-col items-center text-white ${"cursor-pointer"}`}
					>
						<HomeIcon width={24} height={24} />
						<p className="text-xs text-foreground-menu mt-2">Home</p>
					</Link>

					<DialogMobileTrigger />
					{menuItems.map((item) => (
						<Link
							aria-disabled={item.disabled}
							href={item.disabled ? "#" : item.url}
							key={item.url}
							className={`flex flex-col items-center ${
								item.disabled
									? "opacity-50 pointer-events-none"
									: "cursor-pointer"
							}`}
						>
							<Image
								src={item.icon}
								alt={`${item.text} icon`}
								width={24}
								height={24}
							/>
							<p className="text-xs text-foreground-menu mt-2">{item.text}</p>
						</Link>
					))}
				</div>
			</div>
		</>
	);
}

export function Navbar() {
	return (
		<div className="pointer-events-none fixed left-0 top-0 flex h-screen flex-col justify-center px-2">
			<div className="pointer-events-none absolute top-1/2 h-1/3 w-full -translate-y-1/2 bg-blue-500/20 blur-[300px] "></div>
			<div className="pointer-events-auto">
				<div className="inline-flex w-14 flex-col items-start gap-6 rounded-2xl border-[1px] border-gray-700/50 bg-[#1f24289b] px-3 py-4 text-[#b9b9b9] shadow-md shadow-[#1d1d1dc7]">
					<Top />
					{items.map((v) => (
						<NavItem {...v} />
					))}
				</div>
			</div>
		</div>
	);
}

function Top() {
	return (
		<DialogTriggerWrapper>
			<DialogTrigger>
				<div className="space-y-4 group relative">
					<div className="cursor-pointer px-1 hover:scale-105 hover:text-[#bfc4c9] active:scale-90">
						<PlusIcon className="h-6 w-6" />
					</div>
					<div className="h-[1px] w-full bg-[#323b41]"></div>
					<div className="opacity-0 group-hover:opacity-100 scale-x-50 group-hover:scale-x-100 origin-left transition-all  absolute whitespace-nowrap -top-1  -translate-y-1/2 left-[150%] pointer-events-none border-gray-700/50 border-[1px] bg-[#1F2428] shadow-md shadow-[#1d1d1dc7] rounded-xl px-2 py-1">
						Add Memories
					</div>
				</div>
			</DialogTrigger>
		</DialogTriggerWrapper>
	);
}

function NavItem({
	disabled,
	icon,
	url,
	name,
}: {
	disabled: boolean;
	icon: React.JSX.Element;
	name: string;
	url: string;
}) {
	return (
		<div className="relative group">
			<Link aria-disabled={disabled} href={disabled ? "#" : url}>
				<div
					className={`cursor-pointer px-1 hover:scale-105 hover:text-[#bfc4c9] active:scale-90 ${disabled && "opacity-50"}`}
				>
					{icon}
				</div>
			</Link>
			<div className="opacity-0 group-hover:opacity-100 scale-x-50 group-hover:scale-x-100 origin-left transition-all   absolute whitespace-nowrap top-1/2 -translate-y-1/2 left-[150%] pointer-events-none border-gray-700/50 border-[1px] bg-[#1F2428] shadow-md shadow-[#1d1d1dc7] rounded-xl px-2 py-1">
				{name}
			</div>
		</div>
	);
}

export default Menu;
