"use client";

import React, { useState } from "react";
import { FilterSpaces } from "./filterSpaces";
import { ArrowRightIcon } from "@repo/ui/icons";
import Image from "next/image";

function QueryInput({
	setQueryPresent,
	initialQuery,
	initialSpaces,
	handleSubmit,
}: {
	setQueryPresent: (t: boolean) => void;
	initialSpaces?: {
		id: number;
		name: string;
	}[];
	initialQuery?: string;
	mini?: boolean;
	handleSubmit: (q: string, spaces: { id: number; name: string }[]) => void;
}) {
	const [q, setQ] = useState(initialQuery || "");

	const [selectedSpaces, setSelectedSpaces] = useState<
		{ id: number; name: string }[]
	>([]);

	return (
		<div className={`w-full`}>
			<div
				className={`bg-secondary border-2 border-border overflow-hidden shadow-md shadow-[#1d1d1dc7] rounded-3xl`}
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
				>
					<textarea
						autoFocus
						name="q"
						cols={30}
						rows={3}
						className="bg-transparent text-lg placeholder:text-[#9B9B9B] text-gray-200 tracking-[3%] outline-none resize-none w-full p-7"
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
						onChange={(e) =>
							setQ((prev) => {
								setQueryPresent(!!e.target.value.length);
								return e.target.value;
							})
						}
						value={q}
					/>
					<div className="flex p-2 px-3 w-full items-center justify-between rounded-xl overflow-hidden">
						<FilterSpaces
							selectedSpaces={selectedSpaces}
							setSelectedSpaces={setSelectedSpaces}
							initialSpaces={initialSpaces || []}
						/>
						<button type="submit" className="rounded-lg bg-[#369DFD1A] p-3">
							<Image src={ArrowRightIcon} alt="Enter" />
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default QueryInput;
