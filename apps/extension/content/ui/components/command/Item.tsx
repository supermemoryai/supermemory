import React from "react";
import { Command } from "cmdk";
import cn from "mxcn";

const CommandItem = React.forwardRef<
	React.ElementRef<typeof Command.Item>,
	React.ComponentPropsWithoutRef<typeof Command.Item>
>(({ className, ...props }, ref) => (
	<Command.Item
		ref={ref}
		className={cn(
			`h-10 px-3 rounded-xl flex items-center gap-3 aria-selected:bg-focus duration-200 hover:cursor-pointer`,
			className,
		)}
		{...props}
	/>
));
CommandItem.displayName = "CommandItem";

export default CommandItem;
