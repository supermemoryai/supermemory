import { cn } from "@lib/utils";

interface TextSeparatorProps extends React.ComponentProps<"div"> {
	text: string;
}

export function TextSeparator({
	text,
	className,
	...props
}: TextSeparatorProps) {
	return (
		<div
			className={cn("flex gap-4 items-center justify-center", className)}
			{...props}
		>
			<div className="w-full h-px bg-border" />
			<span className="text-muted-foreground text-[0.75rem] uppercase tracking-[-0.2px] leading-[0.875rem]">
				{text}
			</span>
			<div className="w-full h-px bg-border" />
		</div>
	);
}
