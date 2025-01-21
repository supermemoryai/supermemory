"use client";

import * as React from "react";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

export function Combobox({
	options,
	value,
	setValue,
	placeholder,
	createNew,
	className,
}: {
	options: {
		value: string;
		label: string;
	}[];
	value: string;
	setValue: (value: string) => void;
	placeholder?: string;
	createNew?: {
		createAction: (query: string) => Promise<void>;
		createLabel: string;
	};
	className?: string;
}) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");

	const handleCreate = async () => {
		if (createNew) {
			await createNew.createAction(query);
			setOpen(false);
			setQuery("");
		}
	};

	const handleSelect = React.useCallback(
		(currentValue: string) => {
			setValue(currentValue === value ? "" : currentValue);
			setOpen(false);
		},
		[value, setValue],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					role="combobox"
					aria-expanded={open}
					className={cn("w-[200px] justify-between", className)}
				>
					{value ? options.find((option) => option.value === value)?.label : placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder={placeholder} onValueChange={setQuery} />
					<CommandList>
						<CommandEmpty>
							{createNew && (
								<CommandItem onSelect={handleCreate}>
									<Plus className="mr-2 h-4 w-4" />
									{createNew.createLabel.replace("{query}", query)}
								</CommandItem>
							)}
							{!createNew && "No items found."}
						</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem key={option.value} value={option.value} onSelect={handleSelect}>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === option.value ? "opacity-100" : "opacity-0",
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
