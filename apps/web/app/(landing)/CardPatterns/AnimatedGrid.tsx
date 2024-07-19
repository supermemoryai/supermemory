"use client";

import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

interface GridPatternProps {
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	strokeDasharray?: any;
	numSquares?: number;
	className?: string;
	maxOpacity?: number;
	duration?: number;
	repeatDelay?: number;
}

export function GridPattern({
	width = 40,
	height = 40,
	x = -1,
	y = -1,
	strokeDasharray = 0,
	numSquares = 50,
	className,
	maxOpacity = 0.5,
	duration = 4,
	repeatDelay = 0.5,
	...props
}: GridPatternProps) {
	const id = useId();
	const containerRef = useRef(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [squares, setSquares] = useState(() => generateSquares(numSquares));

	function getPos() {
		return [
			Math.floor((Math.random() * dimensions.width) / width),
			Math.floor((Math.random() * dimensions.height) / height),
		];
	}

	// Adjust the generateSquares function to return objects with an id, x, and y
	function generateSquares(count: number) {
		return Array.from({ length: count }, (_, i) => ({
			id: i,
			pos: getPos(),
		}));
	}

	// Function to update a single square's position
	const updateSquarePosition = (id: number) => {
		setSquares((currentSquares) =>
			currentSquares.map((sq) =>
				sq.id === id
					? {
							...sq,
							pos: getPos(),
						}
					: sq,
			),
		);
	};

	// Update squares to animate in
	useEffect(() => {
		if (dimensions.width && dimensions.height) {
			setSquares(generateSquares(numSquares));
		}
	}, [dimensions, numSquares]);

	// Resize observer to update container dimensions
	useEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				setDimensions({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			}
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			if (containerRef.current) {
				resizeObserver.unobserve(containerRef.current);
			}
		};
	}, [containerRef]);

	return (
		<svg
			ref={containerRef}
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
				className,
			)}
			{...props}
		>
			<defs>
				<pattern
					id={id}
					width={width}
					height={height}
					patternUnits="userSpaceOnUse"
					x={x}
					y={y}
				>
					<path
						d={`M.5 ${height}V.5H${width}`}
						fill="none"
						strokeDasharray={strokeDasharray}
					/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill={`url(#${id})`} />
			<svg x={x} y={y} className="overflow-visible">
				{squares.map(({ pos: [x, y], id }, index) => (
					<motion.rect
						initial={{ opacity: 0 }}
						animate={{ opacity: maxOpacity }}
						transition={{
							duration,
							repeat: 1,
							delay: index * 0.1,
							repeatType: "reverse",
						}}
						onAnimationComplete={() => updateSquarePosition(id)}
						key={`${x}-${y}-${index}`}
						width={width - 1}
						height={height - 1}
						x={x ?? 1 * width + 1}
						y={y ?? 1 * height + 1}
						fill="currentColor"
						strokeWidth="0"
					/>
				))}
			</svg>
		</svg>
	);
}

export default GridPattern;
