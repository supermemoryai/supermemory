"use client";

import React, { useState } from "react";
import { FilterSpaces } from "./filterSpaces";

function QueryInput({
	setQueryPresent,
	initialSpaces,
	handleSubmit,
}: {
	setQueryPresent: (t: boolean) => void;
	initialSpaces?: {
		id: number;
		name: string;
	}[];
	mini?: boolean;
	handleSubmit: (q: string, spaces: { id: number; name: string }[]) => void;
}) {
	const [q, setQ] = useState("");

	const [selectedSpaces, setSelectedSpaces] = useState<
		{ id: number; name: string }[]
	>([]);

	return (
		<div className={`w-full`}>
			<div
				className={`bg-[#1F2428]  overflow-hidden border-2 border-gray-700/50 shadow-md shadow-[#1d1d1dc7] rounded-3xl`}
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
						rows={4}
						className="bg-transparent pt-2.5 text-lg placeholder:text-[#9B9B9B] text-gray-200 tracking-[3%] outline-none resize-none w-full p-4"
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
					<FilterSpaces
						selectedSpaces={selectedSpaces}
						setSelectedSpaces={setSelectedSpaces}
						initialSpaces={initialSpaces || []}
					/>
				</form>
			</div>
		</div>
	);
}

export default QueryInput;
