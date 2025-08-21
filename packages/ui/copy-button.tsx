"use client";

import { cn } from "@lib/utils";
import { Button, type buttonVariants } from "@ui/components/button";
import type { VariantProps } from "class-variance-authority";
import { CheckIcon, ClipboardIcon } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";

interface CopyButtonProps
	extends React.ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {
	value: string;
	src?: string;
}

export function CopyButton({
	value,
	className,
	src,
	variant = "ghost",
	...props
}: CopyButtonProps) {
	const [hasCopied, setHasCopied] = React.useState(false);

	useEffect(() => {
		setTimeout(() => {
			setHasCopied(false);
		}, 2000);
	}, []);

	return (
		<Button
			className={cn(
				"relative z-10 text-zinc-50 hover:bg-zinc-700 hover:text-zinc-50 [&_svg]:h-full [&_svg]:w-full",
				className,
			)}
			onClick={() => {
				navigator.clipboard.writeText(value);
				setHasCopied(true);
			}}
			size="icon"
			variant={variant}
			{...props}
		>
			<span className="sr-only">Copy</span>
			{hasCopied ? <CheckIcon /> : <ClipboardIcon />}
		</Button>
	);
}
