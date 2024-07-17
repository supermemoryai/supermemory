import { cn } from "@repo/ui/lib/utils";

export const Gradient = ({ opacity = 50 }: { opacity?: number }) => {
	return (
		<div
			className={cn(
				"absolute top-0 -left-[10rem] w-[56.625rem] h-[56.625rem]  mix-blend-color-dodge",
				`opacity-${opacity}`,
			)}
		>
			<div
				className="top-0 -left-[10rem] w-[56.625rem] h-[56.625rem]   overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-40 blur-[337.4px]"
				style={{ transform: "rotate(-30deg)" }}
			/>
		</div>
	);
};
