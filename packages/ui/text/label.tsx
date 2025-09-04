import { Root } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "cva"
import { cn } from "../../lib/utils"

export const labelVariants = cva({
	base: "tracking-[-0.4px]",
	variants: {
		level: {
			1: "text-[0.875rem] md:text-[1rem] leading-[1.5rem]",
			2: "text-[0.25rem] sm:text-[0.375rem] md:text-[0.5rem] lg:text-[0.625rem] leading-[18px]",
			3: "text-[0.125rem] sm:text-[0.25rem] md:text-[0.375rem] lg:text-[0.5rem] leading-[16px] tracking-[-0.2px]",
		},
		weight: {
			medium: "font-medium",
			regular: "font-normal",
		},
		color: {
			default: "",
			muted: "text-sm-silver-chalice",
		},
	},
	compoundVariants: [
		{
			level: [2, 3],
			color: "default",
			class: "text-sm-silver-chalice",
		},
	],
	defaultVariants: {
		level: 1,
		weight: "regular",
		color: "default",
	},
})

export interface LabelProps
	extends Omit<React.HTMLAttributes<HTMLParagraphElement>, "color">,
		VariantProps<typeof labelVariants> {
	asChild?: boolean
}

export function Label({
	className,
	level = 1,
	weight = "regular",
	color = "default",
	asChild,
	...props
}: LabelProps) {
	const Comp = asChild ? Root : "p"
	return (
		<Comp
			className={cn(labelVariants({ level, weight, color }), className)}
			{...props}
		/>
	)
}

// Export individual variant classes for compatibility
export const label1Medium = () => labelVariants({ level: 1, weight: "medium" })
export const label1Regular = () =>
	labelVariants({ level: 1, weight: "regular" })
export const label2Medium = () => labelVariants({ level: 2, weight: "medium" })
export const label2Regular = () =>
	labelVariants({ level: 2, weight: "regular" })
export const label3Medium = () => labelVariants({ level: 3, weight: "medium" })
export const label3Regular = () =>
	labelVariants({ level: 3, weight: "regular" })
