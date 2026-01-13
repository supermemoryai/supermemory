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
			<span className="text-foreground text-[0.75rem] uppercase tracking-[-0.2px] leading-3.5">
				{text}
			</span>
		</div>
	);
}
