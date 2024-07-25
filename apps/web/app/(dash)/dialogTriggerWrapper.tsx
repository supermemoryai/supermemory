"use client";

import { Dialog, DialogTrigger } from "@repo/ui/shadcn/dialog";
import { useState } from "react";
import { DialogContentContainer } from "./dialogContentContainer";
import { PlusIcon } from "@heroicons/react/24/solid";

export function DialogDesktopTrigger() {
	return (
		<DialogTriggerWrapper>
			<div className="border-gray-700/50 border-[1px] space-y-4 group relative bg-secondary shadow-md shadow-[#1d1d1dc7] rounded-xl flex justify-center">
				<button className="cursor-pointer p-2 hover:scale-105 hover:text-[#bfc4c9] active:scale-90">
					<PlusIcon className="h-6 w-6" />
				</button>
				<div className="opacity-0 group-hover:opacity-100 scale-x-50 group-hover:scale-x-100 origin-left transition-all  absolute whitespace-nowrap pointer-events-none border-gray-700/50 border-[1px] bg-[#1F2428] shadow-md shadow-[#1d1d1dc7] rounded-xl px-2 py-1 left-[120%] -top-2">
					Add Memories
				</div>
			</div>
		</DialogTriggerWrapper>
	);
}

export function DialogMobileTrigger() {
	return (
		<DialogTriggerWrapper>
			<div className={`flex flex-col items-center cursor-pointer text-white`}>
				<PlusIcon className="h-6 w-6 hover:brightness-125 focus:brightness-125 duration-200 stroke-white" />
				<p className="text-xs text-foreground-menu mt-2">Add</p>
			</div>
		</DialogTriggerWrapper>
	);
}
export default function DialogTriggerWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger>{children}</DialogTrigger>
			<DialogContentContainer
				DialogClose={() => {
					setDialogOpen(false);
				}}
			/>
		</Dialog>
	);
}
