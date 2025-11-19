import { Root } from "@radix-ui/react-slot";
import { headingH3Bold } from "./heading.css";

export function HeadingH3Bold({
	className,
	asChild,
	...props
}: React.ComponentProps<"h3"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h3";

	const combinedClassName = className
		? `${headingH3Bold} ${className}`
		: headingH3Bold;

	return (
		<Comp className={combinedClassName} {...props} />
	);
}
