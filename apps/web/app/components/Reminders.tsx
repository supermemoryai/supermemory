import React, { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { useNavigate } from "@remix-run/react";

import { client } from "../lib/utils/api";
import image from "./gradients/gradient1.png";
import { AddMemoryModal } from "./memories/AddMemory";
import { Button } from "./ui/button";

import { MemoryIcon, SpaceIcon } from "@supermemory/shared/icons";
import { motion } from "framer-motion";
import { BookIcon, BookOpen, ChevronDownIcon, SparkleIcon } from "lucide-react";
import { Theme, useTheme } from "~/lib/theme-provider";

function Reminder({ content, contentId }: { content: string; contentId: string }) {
	const [theme] = useTheme();
	const navigate = useNavigate();
	const [isExpanded, setIsExpanded] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const contentRef = React.useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (contentRef.current) {
			setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
		}
	}, [content]);

	if (typeof window === "undefined") return null;

	return (
		<div
			style={{
				backgroundImage:
					theme === Theme.DARK ? "linear-gradient(to right, #414345, #232526)" : `url(${image})`,
				backgroundSize: "cover",
				backgroundPosition: "right",
			}}
			className="border border-slate-500 rounded-2xl md:rounded-3xl flex flex-col gap-2 p-4 md:p-6 md:px-8 dark:bg-opacity-50 h-[500px]"
		>
			<div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
				<SparkleIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
				<h2 className="text-xs md:text-sm truncate">Remember this? A topic you forgot.</h2>
			</div>

			<div ref={contentRef} className={`relative ${isExpanded ? "flex-1" : "h-[400px]"}`}>
				<div className={`${!isExpanded && "absolute inset-0"} overflow-hidden`}>
					<Markdown className="mt-2 prose prose-lg dark:prose-invert leading-tight break-words line-clamp-[15] prose-h1:text-2xl prose-h1:font-semibold prose-h1:tracking-tight prose-h2:text-lg prose-h3:text-base">
						{content}
					</Markdown>
				</div>
				{!isExpanded && isOverflowing && (
					<div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
				)}
			</div>

			{isOverflowing && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setIsExpanded(!isExpanded)}
					className="w-full text-xs flex items-center gap-1 py-1"
				>
					{isExpanded ? "Show less" : "Show more"}
					<ChevronDownIcon
						className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
					/>
				</Button>
			)}

			<div className="grid grid-cols-2 gap-2 md:gap-4 mt-auto">
				<Button
					onClick={() => navigate(`/content/${contentId}`)}
					className="dark flex items-center justify-center gap-1 md:gap-2 border text-xs md:text-sm py-2 min-h-[36px]"
				>
					<BookIcon
						fill="var(--gray-10)"
						stroke="var(--gray-5)"
						className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0"
					/>
					<span className="truncate">
						View <span className="hidden md:inline">content</span>
					</span>
				</Button>
				<Button className="dark flex items-center justify-center gap-1 md:gap-2 border text-xs md:text-sm py-2 min-h-[36px]">
					<SpaceIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
					<span className="truncate">
						Show <span className="hidden md:inline">related</span>
					</span>
				</Button>
			</div>
		</div>
	);
}

function LoadingReminder() {
	return (
		<div className="border border-slate-500 rounded-2xl md:rounded-3xl flex flex-col gap-2 p-4 md:p-6 md:px-8 dark:bg-opacity-50 h-[500px] animate-pulse bg-gray-100 dark:bg-gray-800">
			<div className="flex items-center gap-2">
				<div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
				<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48" />
			</div>
			<div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg mt-2" />
			<div className="grid grid-cols-2 gap-2 md:gap-4">
				<div className="h-9 bg-gray-300 dark:bg-gray-600 rounded" />
				<div className="h-9 bg-gray-300 dark:bg-gray-600 rounded" />
			</div>
		</div>
	);
}

function Reminders() {
	const [suggestedLearnings, setSuggestedLearnings] = useState<Array<Record<string, string>>>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		fetch(`/backend/api/suggested-learnings`, {
			credentials: "include",
		})
			.then((res) => res.json() as Promise<{ suggestedLearnings: Array<Record<string, string>> }>)
			.then((data) => {
				setSuggestedLearnings(data.suggestedLearnings);
				setIsLoading(false);
			})
			.catch((err) => {
				console.error("Failed to fetch suggested learnings:", err);
				setIsLoading(false);
			});
	}, []);

	if (typeof window === "undefined") return null;

	const handleDragEnd = (event: any, info: any) => {
		const DRAG_THRESHOLD = window?.innerWidth * 0.15;

		if (Math.abs(info.offset.x) > DRAG_THRESHOLD) {
			const direction = info.offset.x > 0 ? -1 : 1;
			handleNavigate(direction);
		}
	};

	const handleNavigate = (direction: number) => {
		setCurrentIndex((prevIndex) => {
			const newIndex = prevIndex + direction;
			if (newIndex < 0) return suggestedLearnings.length - 1;
			if (newIndex >= suggestedLearnings.length) return 0;
			return newIndex;
		});
	};

	if (!isLoading && (!suggestedLearnings || suggestedLearnings.length === 0)) {
		return (
			<div className="relative h-[600px] w-full flex items-center justify-center">
				<div className="text-center max-w-lg mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<SparkleIcon className="w-12 h-12 mx-auto mb-6 text-blue-500" />
						<h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
							Your Memory Hub Awaits
						</h2>
						<p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
							Start saving content to get bite-sized memory snippets that keep you on top of your
							game. We'll transform your notes into smart reminders that help you retain knowledge
							effortlessly.
						</p>
						<AddMemoryModal>
							<Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all">
								<BookOpen className="w-4 h-4 mr-2" />
								Add Your First Memory
							</Button>
						</AddMemoryModal>
					</motion.div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="relative h-[600px] w-full overflow-x-hidden md:overflow-visible overflow-y-hidden"
			role="region"
			aria-label="Memory reminders stack"
		>
			<div className="relative w-full h-full translate-y-16">
				{isLoading
					? // Show 3 loading cards when loading
						[...Array(3)]?.map((_, index) => {
							const xOffset = index * (window?.innerWidth < 768 ? 12 : 16);
							const yOffset = index * (window?.innerWidth < 768 ? 12 : 16);
							const opacity = Math.max(1 - index * 0.15, 0.4);
							const scale = 1 - index * (window?.innerWidth < 768 ? 0.02 : 0.03);

							return (
								<motion.div
									key={`loading-${index}`}
									className="absolute w-full left-0 top-0 px-4 md:px-0"
									style={{ zIndex: 3 - index }}
									animate={{
										x: xOffset,
										y: yOffset,
										opacity,
										scale,
									}}
								>
									<LoadingReminder />
								</motion.div>
							);
						})
					: suggestedLearnings?.map((learning, index) => {
							const position =
								(index - currentIndex + suggestedLearnings.length) % suggestedLearnings.length;

							if (position >= 3) return null;

							if (typeof window === "undefined") return null;

							const contentId = Object.keys(learning)[0];
							const content = learning[contentId];

							const zIndex = suggestedLearnings.length - position;
							const xOffset = position * (window?.innerWidth < 768 ? 12 : 16);
							const yOffset = position * (window?.innerWidth < 768 ? 12 : 16);
							const opacity = Math.max(1 - position * 0.15, 0.4);
							const scale = 1 - position * (window?.innerWidth < 768 ? 0.02 : 0.03);

							return (
								<motion.div
									key={index}
									className="absolute w-full left-0 top-0 cursor-grab active:cursor-grabbing px-4 md:px-0"
									style={{ zIndex }}
									animate={{
										x: xOffset,
										y: yOffset,
										opacity,
										scale,
									}}
									transition={{
										type: "spring",
										stiffness: 200,
										damping: 25,
										mass: 1.4,
										restDelta: 0.0001,
										restSpeed: 0.0001,
									}}
									drag={position === 0 ? "x" : false}
									dragConstraints={{ left: 0, right: 0 }}
									dragElastic={0.7}
									dragTransition={{
										bounceStiffness: 200,
										bounceDamping: 25,
										power: 0.3,
									}}
									onDragEnd={position === 0 ? handleDragEnd : undefined}
									whileHover={
										position === 0 && window?.innerWidth >= 768
											? {
													transition: {
														duration: 0.3,
														ease: [0.4, 0, 0.2, 1],
													},
												}
											: undefined
									}
									role="group"
									aria-label={`Memory card ${index + 1} of ${suggestedLearnings.length}`}
								>
									<Reminder content={content} contentId={contentId} />
								</motion.div>
							);
						})}
			</div>

			{/* Navigation controls - Hidden on mobile since we use swipe */}
			{!isLoading && suggestedLearnings.length > 0 && (
				<div className="hidden md:flex absolute bottom-[-48px] left-1/2 transform -translate-x-1/2 items-center gap-4 z-50">
					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.95 }}
						transition={{ type: "spring", stiffness: 400, damping: 17 }}
						onClick={() => handleNavigate(-1)}
						className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
						aria-label="Previous card"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m15 18-6-6 6-6" />
						</svg>
					</motion.button>

					<div className="flex gap-2">
						{suggestedLearnings?.map((_, index) => (
							<motion.button
								key={index}
								whileHover={{ scale: 1.2 }}
								whileTap={{ scale: 0.9 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}
								onClick={() => handleNavigate(index - currentIndex)}
								className={`w-1.5 h-1.5 rounded-full transition-colors ${
									index === currentIndex ? "bg-blue-500" : "bg-gray-300"
								} hover:bg-blue-400`}
								aria-label={`Go to card ${index + 1}`}
							/>
						))}
					</div>

					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.95 }}
						transition={{ type: "spring", stiffness: 400, damping: 17 }}
						onClick={() => handleNavigate(1)}
						className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
						aria-label="Next card"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</motion.button>
				</div>
			)}

			{/* Mobile swipe indicator */}
			{!isLoading && suggestedLearnings.length > 0 && (
				<div className="md:hidden absolute bottom-[-24px] left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
					Swipe to navigate • {currentIndex + 1}/{suggestedLearnings.length}
				</div>
			)}
		</div>
	);
}

export default Reminders;
