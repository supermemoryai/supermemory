"use client";

import React, { useEffect, useState,useRef } from "react";
import { FilterSpaces } from "./filterSpaces";
import { ArrowRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import { Switch } from "@repo/ui/shadcn/switch";
import { Label } from "@repo/ui/shadcn/label";


function QueryInput({
	initialSpaces,
	handleSubmit,
	query,
	setQuery,
}: {
	initialSpaces?: {
		id: number;
		name: string;
	}[];
	mini?: boolean;
	handleSubmit: (
		q: string,
		spaces: { id: number; name: string }[],
		proMode: boolean,
	) => void;
	query: string;
	setQuery: (q: string) => void;
}) {
	const [proMode, setProMode] = useState(false);

	const [selectedSpaces, setSelectedSpaces] = useState<
		{ id: number; name: string }[]
	>([]);

	const divRef=useRef<HTMLDivElement>(null)


	const handleInput = () => {
		if (divRef.current) {
		  setQuery((divRef.current.textContent || ''));
 		}
	  };
	 
	return (
		<div className={`w-full`}>
			<div
				className={`bg-secondary border-2 border-border overflow-hidden shadow-md shadow-[#1d1d1dc7] rounded-3xl`}
			>
				{/* input and action button */}
				<form
					action={async () => {
						if (query.trim().length === 0) {
							return;
						}
						handleSubmit(query, selectedSpaces, proMode);
						setQuery("");
					}}
				>
					<div
					    contentEditable={true}
						autoFocus
						ref={divRef}
						className={`bg-transparent text-lg placeholder:text-[#9B9B9B] text-gray-200 tracking-[3%] outline-none resize-none w-full py-4 px-4 h-32 transition-[height] overflow-y-auto ${query.length > 0 && "h-40"}`}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								if (query.trim().length === 0) {
									return;
								}
								handleSubmit(query, selectedSpaces, proMode);
								setQuery("");
							}
						}} 
 						onInput={handleInput}
						 
					> 
					</div>
					{ query.length===0 &&	<span
                className=" relative bottom-28 left-4 text-lg text-gray-400 pointer-events-none"
                style={{ userSelect: "none" }}
            >
                Ask your second brain...
            </span>}

					<div className="flex p-2 px-3 w-full items-center justify-between rounded-xl overflow-hidden">
						<FilterSpaces
							selectedSpaces={selectedSpaces}
							setSelectedSpaces={setSelectedSpaces}
							initialSpaces={initialSpaces || []}
						/>
						<div className="flex items-center gap-4">
							{/* <div className="flex items-center gap-2 p-2 rounded-lg bg-[#369DFD1A]">
								<Label htmlFor="pro-mode" className="text-sm">
									Pro mode
								</Label>
								<Switch
									value={proMode ? "on" : "off"}
									onCheckedChange={(v) => setProMode(v)}
									id="pro-mode"
									about="Pro mode"
								/>
							</div> */}
							<button type="submit" className="rounded-lg bg-[#369DFD1A] p-3">
								<Image src={ArrowRightIcon} alt="Enter" />
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

export default QueryInput;
