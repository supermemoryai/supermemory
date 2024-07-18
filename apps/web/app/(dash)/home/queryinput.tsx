"use client";

import { ArrowRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import React, { useState } from "react";
import Divider from "@repo/ui/shadcn/divider";
import { FilterSpaces } from "./filterSpaces";

function QueryInput({
	initialSpaces,
	initialQuery = "",
	disabled = false,
	className,
	mini = false,
	handleSubmit,
}: {
	initialQuery?: string;
	initialSpaces?: {
		id: number;
		name: string;
	}[];
	disabled?: boolean;
	className?: string;
	mini?: boolean;
	handleSubmit: (q: string, spaces: { id: number; name: string }[]) => void;
}) {
	const [q, setQ] = useState(initialQuery);

	const [selectedSpaces, setSelectedSpaces] = useState<
		{ id: number; name: string }[]
	>([]);

	return (
		<div className={`${className}`}>
			<div
				className={`bg-[#1F2428]  overflow-hidden border-2 border-gray-700/50  shadow-md shadow-[#1d1d1dc7] rounded-3xl`}
			>
				{/* input and action button */}
				<form
					action={async () => {
						if (q.trim().length === 0) {
							return;
						}
						handleSubmit(q, selectedSpaces);
						setQ("");
					}}
					className="flex gap-4 p-3"
				>
					<textarea
						autoFocus
						name="q"
						cols={30}
						rows={mini ? 2 : 4}
						className="bg-transparent pt-2.5 text-base placeholder:text-[#9B9B9B] focus:text-gray-200 duration-200 tracking-[3%] outline-none resize-none w-full p-4"
						placeholder="Ask your second brain..."
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								if (q.trim().length === 0) {
									return;
								}
								handleSubmit(q, selectedSpaces);
								setQ("");
							}
						}}
						onChange={(e) => setQ(e.target.value)}
						value={q}
						disabled={disabled}
					/>

					<button
						type="submit"
						disabled={disabled}
						className="h-12 w-12 rounded-[14px] bg-border all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90"
					>
						<Image src={ArrowRightIcon} alt="Right arrow icon" />
					</button>
				</form>{" "}
				{!mini && (
					<>
						<Divider />
						<FilterSpaces
							selectedSpaces={selectedSpaces}
							setSelectedSpaces={setSelectedSpaces}
							initialSpaces={initialSpaces || []}
						/>
					</>
				)}
			</div>
			{/* selected sources */}
		</div>
	);
}

export default QueryInput;
