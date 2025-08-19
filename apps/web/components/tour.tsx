"use client";

import { Button } from "@repo/ui/components/button";
import { GlassMenuEffect } from "@repo/ui/other/glass-effect";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { analytics } from "@/lib/analytics";

// Types
export interface TourStep {
	content: React.ReactNode;
	selectorId: string;
	position?: "top" | "bottom" | "left" | "right" | "center";
	onClickWithinArea?: () => void;
}

interface TourContextType {
	currentStep: number;
	totalSteps: number;
	nextStep: () => void;
	previousStep: () => void;
	endTour: () => void;
	isActive: boolean;
	isPaused: boolean;
	startTour: () => void;
	setSteps: (steps: TourStep[]) => void;
	steps: TourStep[];
	isTourCompleted: boolean;
	setIsTourCompleted: (completed: boolean) => void;
	// Expansion state tracking
	setMenuExpanded: (expanded: boolean) => void;
	setChatExpanded: (expanded: boolean) => void;
}

// Context
const TourContext = React.createContext<TourContextType | undefined>(undefined);

export function useTour() {
	const context = React.useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
}

// Provider
interface TourProviderProps {
	children: React.ReactNode;
	onComplete?: () => void;
	className?: string;
	isTourCompleted?: boolean;
}

export function TourProvider({
	children,
	onComplete,
	className,
	isTourCompleted: initialCompleted = false,
}: TourProviderProps) {
	const [currentStep, setCurrentStep] = React.useState(-1);
	const [steps, setSteps] = React.useState<TourStep[]>([]);
	const [isActive, setIsActive] = React.useState(false);
	const [isTourCompleted, setIsTourCompleted] =
		React.useState(initialCompleted);

	// Track expansion states
	const [isMenuExpanded, setIsMenuExpanded] = React.useState(false);
	const [isChatExpanded, setIsChatExpanded] = React.useState(false);

	// Calculate if tour should be paused
	const isPaused = React.useMemo(() => {
		return isActive && (isMenuExpanded || isChatExpanded);
	}, [isActive, isMenuExpanded, isChatExpanded]);

	const startTour = React.useCallback(() => {
		console.debug("Starting tour with", steps.length, "steps");
		analytics.tourStarted();
		setCurrentStep(0);
		setIsActive(true);
	}, [steps]);

	const endTour = React.useCallback(() => {
		setCurrentStep(-1);
		setIsActive(false);
		setIsTourCompleted(true); // Mark tour as completed when ended/skipped
		analytics.tourSkipped();
		if (onComplete) {
			onComplete();
		}
	}, [onComplete]);

	const nextStep = React.useCallback(() => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			analytics.tourCompleted();
			endTour();
			setIsTourCompleted(true);
		}
	}, [currentStep, steps.length, endTour]);

	const previousStep = React.useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	}, [currentStep]);

	const setMenuExpanded = React.useCallback((expanded: boolean) => {
		setIsMenuExpanded(expanded);
	}, []);

	const setChatExpanded = React.useCallback((expanded: boolean) => {
		setIsChatExpanded(expanded);
	}, []);

	const value = React.useMemo(
		() => ({
			currentStep,
			totalSteps: steps.length,
			nextStep,
			previousStep,
			endTour,
			isActive,
			isPaused,
			startTour,
			setSteps,
			steps,
			isTourCompleted,
			setIsTourCompleted,
			setMenuExpanded,
			setChatExpanded,
		}),
		[
			currentStep,
			steps,
			nextStep,
			previousStep,
			endTour,
			isActive,
			isPaused,
			startTour,
			isTourCompleted,
			setMenuExpanded,
			setChatExpanded,
		],
	);

	return (
		<TourContext.Provider value={value}>
			{children}
			{isActive && !isPaused && (
				<>
					{console.log(
						"Rendering TourHighlight for step:",
						currentStep,
						currentStep >= 0 && currentStep < steps.length
							? steps[currentStep]
							: "No step",
					)}
					<TourHighlight
						className={className}
						currentStepIndex={currentStep}
						steps={steps}
					/>
				</>
			)}
		</TourContext.Provider>
	);
}

// Tour Highlight Component
function TourHighlight({
	currentStepIndex,
	steps,
	className,
}: {
	currentStepIndex: number;
	steps: TourStep[];
	className?: string;
}) {
	const { nextStep, previousStep, endTour } = useTour();
	const [elementRect, setElementRect] = React.useState<DOMRect | null>(null);

	// Get current step safely
	const step =
		currentStepIndex >= 0 && currentStepIndex < steps.length
			? steps[currentStepIndex]
			: null;

	React.useEffect(() => {
		if (!step) return;

		// Use requestAnimationFrame to ensure DOM is ready
		const rafId = requestAnimationFrame(() => {
			const element = document.getElementById(step.selectorId);
			console.debug(
				"Looking for element with ID:",
				step.selectorId,
				"Found:",
				!!element,
			);
			if (element) {
				const rect = element.getBoundingClientRect();
				console.debug("Element rect:", {
					id: step.selectorId,
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
					bottom: rect.bottom,
					right: rect.right,
				});
				setElementRect(rect);
			}
		});

		// Add click listener for onClickWithinArea
		let clickHandler: ((e: MouseEvent) => void) | null = null;
		if (step.onClickWithinArea) {
			const element = document.getElementById(step.selectorId);
			if (element) {
				clickHandler = (e: MouseEvent) => {
					if (element.contains(e.target as Node)) {
						step.onClickWithinArea?.();
					}
				};
				document.addEventListener("click", clickHandler);
			}
		}

		return () => {
			cancelAnimationFrame(rafId);
			if (clickHandler) {
				document.removeEventListener("click", clickHandler);
			}
		};
	}, [step]);

	if (!step) return null;

	// Keep the wrapper mounted but animate the content
	return (
		<AnimatePresence mode="wait">
			{elementRect && (
				<motion.div
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					initial={{ opacity: 0 }}
					key={`tour-step-${currentStepIndex}`}
					transition={{ duration: 0.2 }}
				>
					{/* Highlight Border */}
					<motion.div
						animate={{ opacity: 1, scale: 1 }}
						className={`fixed z-[101] pointer-events-none ${className}`}
						exit={{ opacity: 0, scale: 0.95 }}
						initial={{ opacity: 0, scale: 0.95 }}
						style={{
							top: elementRect.top + window.scrollY,
							left: elementRect.left + window.scrollX,
							width: elementRect.width,
							height: elementRect.height,
						}}
					>
						<div className="absolute inset-0 rounded-lg outline-4 outline-blue-500/50 outline-offset-0" />
					</motion.div>

					{/* Tooltip with Glass Effect */}
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="fixed z-[102] w-72 rounded-lg shadow-xl overflow-hidden"
						exit={{ opacity: 0, y: step.position === "top" ? 10 : -10 }}
						initial={{ opacity: 0, y: step.position === "top" ? 10 : -10 }}
						style={{
							top: (() => {
								const baseTop =
									step.position === "bottom"
										? elementRect.bottom + 8
										: step.position === "top"
											? elementRect.top - 200
											: elementRect.top + elementRect.height / 2 - 100;

								// Ensure tooltip stays within viewport
								const maxTop = window.innerHeight - 250; // Leave space for tooltip height
								const minTop = 10;
								return Math.max(minTop, Math.min(baseTop, maxTop));
							})(),
							left: (() => {
								const baseLeft =
									step.position === "right"
										? elementRect.right + 8
										: step.position === "left"
											? elementRect.left - 300
											: elementRect.left + elementRect.width / 2 - 150;

								// Ensure tooltip stays within viewport
								const maxLeft = window.innerWidth - 300; // Tooltip width
								const minLeft = 10;
								return Math.max(minLeft, Math.min(baseLeft, maxLeft));
							})(),
						}}
					>
						{/* Glass effect background */}
						<GlassMenuEffect rounded="rounded-lg" />

						{/* Content */}
						<div className="relative z-10 p-4">
							<div className="mb-4 text-white">{step.content}</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-300">
									{currentStepIndex + 1} / {steps.length}
								</span>
								<div className="flex gap-2">
									<Button
										className="border-white/20 text-white hover:bg-white/10"
										onClick={endTour}
										size="sm"
										variant="outline"
									>
										Skip
									</Button>
									{currentStepIndex > 0 && (
										<Button
											className="border-white/20 text-white hover:bg-white/10"
											onClick={previousStep}
											size="sm"
											variant="outline"
										>
											Previous
										</Button>
									)}
									<Button
										className="bg-white/20 text-white hover:bg-white/30"
										onClick={nextStep}
										size="sm"
									>
										{currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
									</Button>
								</div>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

// Tour Alert Dialog
interface TourAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TourAlertDialog({ open, onOpenChange }: TourAlertDialogProps) {
	const { startTour, setIsTourCompleted } = useTour();

	const handleStart = () => {
		console.debug("TourAlertDialog: Starting tour");
		onOpenChange(false);
		startTour();
	};

	const handleSkip = () => {
		analytics.tourSkipped();
		setIsTourCompleted(true); // Mark tour as completed when skipped
		onOpenChange(false);
	};

	if (!open) return null;

	return (
		<AnimatePresence>
			<motion.div
				animate={{ opacity: 1, scale: 1 }}
				className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[102] w-[90vw] max-w-2xl rounded-lg shadow-xl overflow-hidden"
				exit={{ opacity: 0, scale: 0.95 }}
				initial={{ opacity: 0, scale: 0.95 }}
			>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="rounded-lg" />

				{/* Content */}
				<div className="relative z-10 p-8 md:p-10 lg:p-12">
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
						Welcome to supermemory™
					</h2>
					<p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
						This is your personal knowledge graph where all your memories are
						stored and connected. Let's take a quick tour to help you get
						familiar with the interface.
					</p>
					<div className="flex gap-4 justify-end">
						<Button
							className="border-white/20 text-white hover:bg-white/10 px-6 py-2 text-base"
							onClick={handleSkip}
							size="lg"
							variant="outline"
						>
							Skip Tour
						</Button>
						<Button
							className="bg-white/20 text-white hover:bg-white/30 px-6 py-2 text-base"
							onClick={handleStart}
							size="lg"
						>
							Start Tour
						</Button>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
