import { clsx } from "clsx";

export function PlusGrid({
	className = "",
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return <div className={className}>{children}</div>;
}

export function PlusGridRow({
	className = "",
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={clsx(
				className,
				"group/row relative isolate pt-[calc(theme(spacing.2)+1px)] last:pb-[calc(theme(spacing.2)+1px)]",
			)}
		>
			<div
				aria-hidden="true"
				className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2"
			>
				<div className="absolute inset-x-0 top-0 border-t border-black/10 dark:border-white/10"></div>
				<div className="absolute inset-x-0 top-2 border-t border-black/10 dark:border-white/10"></div>
				<div className="absolute inset-x-0 bottom-0 hidden border-b border-black/10 group-last/row:block dark:border-white/10"></div>
				<div className="b absolute inset-x-0 bottom-2 hidden border-b border-black/10 group-last/row:block dark:border-white/10"></div>
			</div>
			{children}
		</div>
	);
}

export function PlusGridItem({
	className = "",
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={clsx(className, "group/item relative")}>
			<PlusGridIcon placement="top left" className="hidden group-first/item:block" />
			<PlusGridIcon placement="top right" />
			<PlusGridIcon
				placement="bottom left"
				className="hidden group-last/row:group-first/item:block"
			/>
			<PlusGridIcon placement="bottom right" className="hidden group-last/row:block" />
			{children}
		</div>
	);
}

export function PlusGridIcon({
	className = "",
	placement,
}: {
	className?: string;
	placement: `${"top" | "bottom"} ${"right" | "left"}`;
}) {
	let [yAxis, xAxis] = placement.split(" ");

	let yClass = yAxis === "top" ? "-top-2" : "-bottom-2";
	let xClass = xAxis === "left" ? "-left-2" : "-right-2";

	return (
		<svg
			viewBox="0 0 15 15"
			aria-hidden="true"
			className={clsx(
				className,
				"absolute size-[15px] fill-black/5 dark:fill-white/10",
				yClass,
				xClass,
			)}
		>
			<path d="M8 0H7V7H0V8H7V15H8V8H15V7H8V0Z" />
		</svg>
	);
}
