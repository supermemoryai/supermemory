"use client";

import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
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
	placeholder?: string;
	emptyMessage?: string;
	createNewMessage?: string;
	className?: string;
}

const ComboboxWithCreate: React.FC<ComboboxWithCreateProps> = ({
	options: initialOptions,
	onSelect,
	onSubmit,
	placeholder = "Select an option",
	emptyMessage = "No option found.",
	createNewMessage = "Create - ",
	className,
}) => {
	const [options, setOptions] = useState<Option[]>(initialOptions);
	const [inputValue, setInputValue] = useState("");

	useEffect(() => {
		setOptions(initialOptions);
	}, [initialOptions]);

	return (
		<Command className={cn("group", className)}>
			<CommandInput
				onChangeCapture={(e: React.ChangeEvent<HTMLInputElement>) =>
					setInputValue(e.currentTarget.value)
				}
				placeholder={placeholder}
				value={inputValue}
			/>
			<CommandList className="z-10 translate-y-12 translate-x-5 opacity-0 absolute group-focus-within:opacity-100 bg-secondary p-2 rounded-b-xl max-w-64">
				<CommandGroup className="hidden group-focus-within:block">
					{options.map((option, idx) => (
						<CommandItem
							key={`opt-${idx}`}
							onSelect={() => onSelect(option.value)}
						>
							{option.label}
						</CommandItem>
					))}
					{!options.map((opts) => opts.label).includes(inputValue) && (
						<Button
							className="px-1"
							type="button"
							onClick={async () => onSubmit(inputValue)}
							variant="link"
							disabled={inputValue.length === 0}
						>
							{inputValue.length > 0 ? (
								<>
									{createNewMessage} "{inputValue}"
								</>
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
