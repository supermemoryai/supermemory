import { Root } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "cva"
import { cn } from "../../lib/utils"

export const titleVariants = cva({
	base: "tracking-[-0.4px]",
	variants: {
		level: {
			1: "text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-[70px] tracking-[-0.8px]",
			2: "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-[48px]",
			3: "text-base sm:text-lg md:text-xl lg:text-2xl leading-[40px]",
		},
		weight: {
			bold: "font-bold",
			medium: "font-medium",
		},
	},
	compoundVariants: [
		{
			level: 2,
			weight: "medium",
			class: "leading-[32px] md:leading-[48px]",
		},
	],
	defaultVariants: {
		level: 1,
		weight: "medium",
	},
})

export interface TitleProps
	extends React.HTMLAttributes<HTMLHeadingElement>,
		VariantProps<typeof titleVariants> {
	asChild?: boolean
}

export function Title({
	className,
	level = 1,
	weight = "medium",
	asChild,
	...props
}: TitleProps) {
	const levelMap = {
		1: "h1",
		2: "h2",
		3: "h3",
	} as const

	const Comp = asChild ? Root : levelMap[level]
	return (
		<Comp
			className={cn(titleVariants({ level, weight }), className)}
			{...props}
		/>
	)
}

// Export individual variant classes for compatibility
export const title1Bold = () => titleVariants({ level: 1, weight: "bold" })
export const title1Medium = () => titleVariants({ level: 1, weight: "medium" })
export const title2Bold = () => titleVariants({ level: 2, weight: "bold" })
export const title2Medium = () => titleVariants({ level: 2, weight: "medium" })
export const title3Bold = () => titleVariants({ level: 3, weight: "bold" })
export const title3Medium = () => titleVariants({ level: 3, weight: "medium" })
