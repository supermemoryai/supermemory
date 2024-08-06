"use client";

import React, { useRef, useEffect, useState } from "react";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { cn } from "@repo/ui/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Item ref={ref} className={cn(className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Header className="flex">
		<AccordionPrimitive.Trigger
			ref={ref}
			className={cn(
				"flex flex-1 items-center gap-2 py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
				className,
			)}
			{...props}
		>
			{children}

			<ChevronDownIcon className="size-4 stroke-2 transition-transform duration-200" />
		</AccordionPrimitive.Trigger>
	</AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [fadeWidth, setFadeWidth] = useState(0);

	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			if (containerRef.current) {
				event.preventDefault();
				if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
					containerRef.current.scrollLeft += event.deltaX;
				} else {
					containerRef.current.scrollLeft += event.deltaY;
				}
			}
		};

		const handleScroll = () => {
			if (containerRef.current) {
				const { scrollWidth, clientWidth, scrollLeft } = containerRef.current;
				const calculatedFadeWidth = Math.min(
					8,
					scrollWidth - clientWidth - scrollLeft,
				);
				setFadeWidth(calculatedFadeWidth);
			}
		};

		const currentRef = containerRef.current;
		currentRef?.addEventListener("wheel", handleWheel);
		currentRef?.addEventListener("scroll", handleScroll);
		handleScroll();

		return () => {
			currentRef?.removeEventListener("wheel", handleWheel);
			currentRef?.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const fadeStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		right: 0,
		width: `${fadeWidth}px`,
		height: "85%",
		pointerEvents: "none",
		background: "linear-gradient(to left, rgb(46, 58, 72), transparent)",
	};

	return (
		<AccordionPrimitive.Content
			ref={ref}
			className="relative overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
			{...props}
		>
			<div
				ref={containerRef}
				className={cn("pb-4 pt-0", className)}
				style={{ position: "relative" }}
			>
				{children}
			</div>
			{/* Fade-out effect with inline styles */}
			<div style={fadeStyle}></div>
		</AccordionPrimitive.Content>
	);
});

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
