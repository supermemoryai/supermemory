"use client";

import { cn } from "@lib/utils";
import { Label1Regular } from "@ui/text/label/label-1-regular";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

interface CopyableCellProps extends React.HTMLAttributes<HTMLDivElement> {
	value: string;
	displayValue?: React.ReactNode;
}

export function CopyableCell({
	value,
	displayValue,
	className,
	children,
	...props
}: CopyableCellProps) {
	const [hasCopied, setHasCopied] = React.useState(false);

	React.useEffect(() => {
		if (hasCopied) {
			const timeout = setTimeout(() => {
				setHasCopied(false);
			}, 2000);
			return () => clearTimeout(timeout);
		}
	}, [hasCopied]);

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(value);
			setHasCopied(true);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: shadcn
		// biome-ignore lint/a11y/useKeyWithClickEvents: shadcn
		<div
			className={cn(
				"cursor-pointer transition-colors duration-200",
				"hover:bg-zinc-800/50 hover:text-zinc-50",
				"rounded px-2 py-1 -mx-2 -my-1",
				"relative",
				className,
			)}
			onClick={handleCopy}
			{...props}
		>
			<AnimatePresence mode="wait">
				{hasCopied ? (
					<Label1Regular asChild className="block">
						<motion.span
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							initial={{ opacity: 0, y: 10 }}
							key="copied"
							transition={{ duration: 0.2 }}
						>
							Copied!
						</motion.span>
					</Label1Regular>
				) : (
					<Label1Regular asChild>
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							initial={{ opacity: 0, y: -10 }}
							key="content"
							transition={{ duration: 0.2 }}
						>
							{displayValue || children || value}
						</motion.div>
					</Label1Regular>
				)}
			</AnimatePresence>
		</div>
	);
}
