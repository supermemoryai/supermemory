"use client";

import { useState } from "react";
import { Button } from "./button";
import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";

interface Option {
	value: string;
	label: string;
}

interface ComboboxWithCreateProps {
	options: Option[];
	onSelect: (value: string) => void;
	onSubmit: (newName: string) => void;
	selectedSpaces: number[];
	setSelectedSpaces: React.Dispatch<React.SetStateAction<number[]>>;
}

const ComboboxWithCreate = ({
	options,
	onSelect,
	onSubmit,
	selectedSpaces,
	setSelectedSpaces,
}: ComboboxWithCreateProps) => {
	const [inputValue, setInputValue] = useState("");

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (
			e.key === "Backspace" &&
			inputValue === "" &&
			selectedSpaces.length > 0
		) {
			setSelectedSpaces((prev) => prev.slice(0, -1));
		}
	};

	const filteredOptions = options.filter(
		(option) => !selectedSpaces.includes(parseInt(option.value)),
	);

	return (
		<Command
			className={`group flex bg-[#2F353C] h-min rounded-md ${selectedSpaces.length > 0 && "p-2"} transition-all mt-4 mb-4`}
		>
			<div className="inline-flex flex-wrap gap-1">
				{selectedSpaces.map((spaceId) => (
					<button
						key={spaceId}
						type="button"
						onClick={() =>
							setSelectedSpaces((prev) => prev.filter((id) => id !== spaceId))
						}
						className="relative group rounded-md py-1 px-2 bg-[#3C464D] max-w-32"
					>
						<p className="line-clamp-1">
							{options.find((opt) => opt.value === spaceId.toString())?.label}
						</p>
					</button>
				))}
			</div>
			<CommandInput
				onChangeCapture={handleInputChange}
				onKeyDown={handleKeyDown}
				placeholder="Select or create a new space."
				value={inputValue}
			/>
			<CommandList className={`z-10 translate-x-5 opacity-0 transition-all absolute group-focus-within:opacity-100 bg-secondary p-2 rounded-b-xl max-w-64 ${selectedSpaces.length > 0 ?"translate-y-20": "translate-y-12"}`}>
				<CommandGroup className="hidden group-focus-within:block">
					{filteredOptions.map((option) => (
						<CommandItem
							key={option.value}
							onSelect={() => onSelect(option.value)}
						>
							{option.label}
						</CommandItem>
					))}
					{!options.map((opt) => opt.label).includes(inputValue) && (
						<Button
							className="px-1"
							type="button"
							onClick={() => onSubmit(inputValue)}
							variant="link"
							disabled={inputValue.length < 1}
						>
							{inputValue.length > 0 ? (
								<>Create - "{inputValue}"</>
							) : (
								<>Type to create a new space</>
							)}
						</Button>
					)}
				</CommandGroup>
			</CommandList>
		</Command>
	);
};

export default ComboboxWithCreate;