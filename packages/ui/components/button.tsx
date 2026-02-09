import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: " text-primary-foreground shadow-xs hover:bg-primary/90",
				newDefault:
					"bg-gradient-to-b from-[#1C2026] to-[#12161C] text-white shadow-[inset_-2px_-2px_6px_0_rgba(0,0,0,0.15),inset_2px_2px_4px_0_rgba(255,255,255,0.05)] hover:from-[#1C2026]/90 hover:to-[#12161C]/90",
				destructive:
					"bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
				secondary:
					"bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
				headers:
					"border-[#161F2C] border bg-gradient-to-b from-neutral-900 to-black !text-[14px] hover:from-neutral-800 hover:to-neutral-950 hover:border-[#2a3a4f] active:from-neutral-950 active:to-black transition-all",
				ghost:
					"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
				link: "text-primary underline-offset-4 hover:underline",
				settingsNav: "cursor-pointer rounded-sm bg-transparent",
				onboarding:
					"rounded-xl !px-6 !py-3 bg-black border border-[#161F2C] hover:bg-[#161F2C] !h-[40px] cursor-pointer text-white",
				linkPreview:
					"rounded-xl !px-3 !py-1 bg-black border border-[#161F2C] hover:bg-[#161F2C] cursor-pointer text-white border border-[#161F2C]",
				insideOut: "shadow-inside-out rounded-full bg-[#0D121A] cursor-pointer",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
				settingsNav: "h-8 gap-0 px-0 py-0",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	if (asChild) {
		return (
			<Slot
				className={cn(buttonVariants({ variant, size, className }))}
				data-slot="button"
				{...(props as any)}
			/>
		);
	}

	return (
		<button
			className={cn(buttonVariants({ variant, size, className }))}
			data-slot="button"
			{...props}
		/>
	);
}

export { Button, buttonVariants };
