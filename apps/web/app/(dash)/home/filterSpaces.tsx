import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@repo/ui/shadcn/command";
import { Check } from "lucide-react";
import React, { useState } from "react";

type space = {
	id: number;
	name: string;
};

export function FilterSpaces({
	initialSpaces,
	selectedSpaces,
	setSelectedSpaces
}: {
	initialSpaces: space[];
	selectedSpaces: space[];
	setSelectedSpaces: React.Dispatch<React.SetStateAction<space[]>>
}) {
	const [input, setInput] = useState<string>("");

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace" && input === "") {
			setSelectedSpaces((prevValue) => prevValue.slice(0, -1));
		}
	};

	const handleSelect = (selectedSpace: space) => {
		setSelectedSpaces((current) =>
			current.some((space) => space.id === selectedSpace.id)
				? current.filter((space) => space.id !== selectedSpace.id)
				: [...current, selectedSpace]
		);
	};

	return (
		<div className={`flex rounded-md overflow-hidden ${selectedSpaces.length ? "bg-[#2C3338]" : ""}`}>
			<div className="flex rounded-lg items-center">
				{selectedSpaces.map((v) => (
					<button
						key={v.id}
						onClick={() => handleSelect(v)}
						className="bg-[#3a4248] max-w-32 truncate-wor truncate whitespace-nowrap py-1 rounded-md px-2 mx-1 aria-selected:outline"
					>
						{v.name}
					</button>
				))}
			</div>
			<Command className={`group border-0 bg-[rgb(44,51,56)] text-white outline-0 ${selectedSpaces.length ? "w-full" : "w-44"}`}>
				<div className="relative">
					<CommandInput
						placeholder={selectedSpaces.length ? "" : "Search in Spaces"}
						onKeyDown={handleKeyDown}
						className="text-white peer placeholder:text-white"
						// @ts-ignore - trust me bro it works
						onChange={(e) => setInput(e.currentTarget.value)}
						value={input}
					/>
					<ChevronUpDownIcon
						className={`h-6 w-6 text-[#858B92] absolute top-1/2 right-4 -translate-y-1/2 ${selectedSpaces.length && "opacity-0"}`}
					/>
				</div>
				<CommandList className="z-10 translate-y-12 translate-x-5 opacity-0 absolute group-focus-within:opacity-100 transition-opacity p-2 rounded-b-xl max-w-64 bg-[#2C3338]">
					<CommandGroup className="hidden group-focus-within:block">
						{initialSpaces.map((space) => (
							<CommandItem
								className="text-[#eaeaea] data-[disabled]:opacity-90"
								value={space.name}
								key={space.id}
								onSelect={() => handleSelect(space)}
							>
								<Check
									className={`mr-2 h-4 w-4 ${selectedSpaces.some((v) => v.id === space.id) ? "opacity-100" : "opacity-0"}`}
								/>
								{space.name}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	);
}
