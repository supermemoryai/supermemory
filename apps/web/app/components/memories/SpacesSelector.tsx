import React from "react";

import { SpaceIcon } from "@supermemory/shared/icons";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useSpaces } from "~/lib/hooks/use-spaces";
import { cn } from "~/lib/utils";

function SpacesSelector({
	selectedSpaces = [],
	onChange,
}: {
	selectedSpaces?: string[];
	onChange?: (spaces: string[]) => void;
}) {
	const { spaces, isLoading } = useSpaces();
	const [open, setOpen] = React.useState(false);

	const handleSelect = (currentValue: string) => {
		if (!onChange || !spaces) return;

		const selectedSpace = spaces.find(
			(space) => space.name.toLowerCase() === currentValue.toLowerCase(),
		);
		if (!selectedSpace) return;

		const spaceId = selectedSpace.uuid;
		if (selectedSpaces.includes(spaceId)) {
			onChange(selectedSpaces.filter((id) => id !== spaceId));
		} else {
			onChange([...selectedSpaces, spaceId]);
		}
		setOpen(false);
	};

	const handleRemove = (e: React.MouseEvent, spaceId: string) => {
		e.stopPropagation();
		if (!onChange) return;
		onChange(selectedSpaces.filter((id) => id !== spaceId));
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="min-w-[40px] h-10 px-2 md:px-3 flex-1 md:flex-none flex items-center gap-1 md:gap-2 text-secondary-foreground hover:bg-gray-100 dark:hover:bg-neutral-600"
				>
					<SpaceIcon className="h-5 w-5 min-h-[20px] min-w-[20px]" />
					<div className="hidden md:flex flex-wrap gap-1 flex-grow max-w-[200px] overflow-hidden">
						{isLoading ? (
							<span className="animate-pulse">Loading...</span>
						) : selectedSpaces.length === 0 ? (
							<span>Space</span>
						) : (
							<div className="flex flex-nowrap overflow-hidden">
								{selectedSpaces.slice(0, 2).map((spaceId) => {
									const space = spaces?.find((s) => s.uuid === spaceId);
									if (!space) return null;
									return (
										<Badge key={spaceId} variant="secondary" className="flex items-center gap-1 text-xs whitespace-nowrap mr-1">
											{space.name}
											<X
												className="h-3 w-3 cursor-pointer hover:text-destructive"
												onClick={(e) => handleRemove(e, spaceId)}
											/>
										</Badge>
									);
								})}
								{selectedSpaces.length > 2 && (
									<Badge variant="secondary" className="text-xs whitespace-nowrap">
										+{selectedSpaces.length - 2} more
									</Badge>
								)}
							</div>
						)}
					</div>
					{/* Mobile badge count */}
					{selectedSpaces.length > 0 && (
						<span className="md:hidden text-xs bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded-full">
							{selectedSpaces.length}
						</span>
					)}
					<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[280px] md:w-[320px] p-0">
				<Command>
					<CommandInput placeholder="Search spaces..." className="h-9" />
					<CommandEmpty>No spaces found.</CommandEmpty>
					<CommandGroup className="max-h-[200px] overflow-y-auto">
						{spaces?.map((space) => (
							<CommandItem
								key={space.uuid}
								value={space.name}
								onSelect={handleSelect}
								className="cursor-pointer py-2 px-2"
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4",
										selectedSpaces.includes(space.uuid) ? "opacity-100" : "opacity-0",
									)}
								/>
								<div className="flex items-center justify-between w-full">
									<span className="text-sm truncate">{space.name}</span>
									{space.isPublic && (
										<Badge variant="secondary" className="ml-2 text-xs">
											Public
										</Badge>
									)}
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default SpacesSelector;
