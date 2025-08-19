"use client";

import { cn } from "@lib/utils";
import { Button } from "@ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

interface Option {
	value: string;
	label: string;
}

interface ComboboxProps {
	options: Option[];
	onSelect: (value: string) => void;
	onSubmit: (newName: string) => void;
	selectedValues: string[];
	setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>;
	className?: string;
	placeholder?: string;
	triggerClassName?: string;
}

export function Combobox({
	options,
	onSelect,
	onSubmit,
	selectedValues,
	setSelectedValues,
	className,
	placeholder = "Select...",
	triggerClassName,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [inputValue, setInputValue] = React.useState("");

	const handleSelect = (value: string) => {
		onSelect(value);
		setOpen(false);
		setInputValue("");
	};

	const handleCreate = () => {
		if (inputValue.trim()) {
			onSubmit(inputValue);
			setOpen(false);
			setInputValue("");
		}
	};

	const handleRemove = (valueToRemove: string) => {
		setSelectedValues((prev) =>
			prev.filter((value) => value !== valueToRemove),
		);
	};

	const filteredOptions = options.filter(
		(option) => !selectedValues.includes(option.value),
	);

	const isNewValue =
		inputValue.trim() &&
		!options.some(
			(option) => option.label.toLowerCase() === inputValue.toLowerCase(),
		);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				{/** biome-ignore lint/a11y/useSemanticElements: shadcn*/}
				<Button
					aria-expanded={open}
					className={cn(
						"w-full justify-between min-h-10 h-auto",
						triggerClassName,
					)}
					role="combobox"
					variant="outline"
				>
					<div className="flex flex-wrap gap-1 items-center w-full">
						{selectedValues.length > 0 ? (
							selectedValues.map((value) => {
								const option = options.find((opt) => opt.value === value);
								return (
									<span
										className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-sm rounded-md"
										key={value}
									>
										{option?.label || value}
										<button
											className="hover:text-destructive"
											onClick={(e) => {
												e.stopPropagation();
												handleRemove(value);
											}}
											type="button"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								);
							})
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
					<ChevronsUpDown className="opacity-50 ml-2 shrink-0" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn("w-full p-0", className)}>
				<Command>
					<CommandInput
						className="h-9"
						onValueChange={setInputValue}
						placeholder="Search or create..."
						value={inputValue}
					/>
					<CommandList>
						{filteredOptions.length === 0 && !isNewValue && (
							<CommandEmpty>No options found.</CommandEmpty>
						)}
						<CommandGroup>
							{filteredOptions.map((option) => (
								<CommandItem
									key={option.value}
									onSelect={() => handleSelect(option.value)}
									value={option.value}
								>
									{option.label}
									<Check
										className={cn(
											"ml-auto",
											selectedValues.includes(option.value)
												? "opacity-100"
												: "opacity-0",
										)}
									/>
								</CommandItem>
							))}
							{isNewValue && (
								<CommandItem
									className="text-primary cursor-pointer"
									onSelect={handleCreate}
								>
									Create "{inputValue}"
								</CommandItem>
							)}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
