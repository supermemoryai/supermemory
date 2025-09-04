import { Root } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "cva"
import { cn } from "../../lib/utils"

export const headingVariants = cva({
	base: "tracking-[-0.4px]",
	variants: {
		level: {
			h1: "text-sm sm:text-base md:text-lg lg:text-xl leading-[32px]",
			h2: "text-xs sm:text-sm md:text-base lg:text-lg leading-[30px]",
			h3: "text-[0.625rem] sm:text-xs md:text-sm lg:text-base leading-[28px]",
			h4: "text-[0.5rem] sm:text-[0.625rem] md:text-xs lg:text-sm leading-[24px]",
		},
		weight: {
			bold: "font-bold",
			medium: "font-medium",
		},
	},
	defaultVariants: {
		level: "h1",
		weight: "medium",
	},
})

export interface HeadingProps
	extends React.HTMLAttributes<HTMLHeadingElement>,
		VariantProps<typeof headingVariants> {
	asChild?: boolean
}

export function Heading({
	className,
	level = "h1",
	weight = "medium",
	asChild,
	...props
}: HeadingProps) {
	const Comp = asChild ? Root : level
	return (
		<Comp
			className={cn(headingVariants({ level, weight }), className)}
			{...props}
		/>
	)
}

// Export individual variant classes for compatibility
export const headingH1Bold = () =>
	headingVariants({ level: "h1", weight: "bold" })
export const headingH1Medium = () =>
	headingVariants({ level: "h1", weight: "medium" })
export const headingH2Bold = () =>
	headingVariants({ level: "h2", weight: "bold" })
export const headingH2Medium = () =>
	headingVariants({ level: "h2", weight: "medium" })
export const headingH3Bold = () =>
	headingVariants({ level: "h3", weight: "bold" })
export const headingH3Medium = () =>
	headingVariants({ level: "h3", weight: "medium" })
export const headingH4Bold = () =>
	headingVariants({ level: "h4", weight: "bold" })
export const headingH4Medium = () =>
	headingVariants({ level: "h4", weight: "medium" })
