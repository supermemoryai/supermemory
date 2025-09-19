import { AnimatePresence, motion } from "framer-motion";
import { Brain, Chrome, ExternalLink, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ConnectAIModal } from "@/components/connect-ai-modal";
import { analytics } from "@/lib/analytics";

interface GetStartedProps {
	setShowAddMemoryView?: (show: boolean) => void;
}

export const GetStarted = ({ setShowAddMemoryView }: GetStartedProps) => {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [showContent, setShowContent] = useState(false);
	const [showConnectAIModal, setShowConnectAIModal] = useState(false);

	useEffect(() => {
		const img = new Image();
		img.onload = () => {
			setImageLoaded(true);
			setTimeout(() => setShowContent(true), 100);
		};
		img.src = "/images/onboarding.png";
	}, []);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.8,
				ease: [0.25, 0.1, 0.25, 1] as const,
				staggerChildren: 0.15,
				delayChildren: 0.2,
			},
		},
	};

	const leftColumnVariants = {
		hidden: {
			opacity: 0,
			x: -40,
		},
		visible: {
			opacity: 1,
			x: 0,
			transition: {
				duration: 1,
				ease: [0.25, 0.1, 0.25, 1] as const,
				staggerChildren: 0.1,
			},
		},
	};

	const rightColumnVariants = {
		hidden: {
			opacity: 0,
			x: 40,
		},
		visible: {
			opacity: 1,
			x: 0,
			transition: {
				duration: 0.8,
				ease: [0.25, 0.1, 0.25, 1] as const,
				delay: 0.6,
				staggerChildren: 0.1,
			},
		},
	};

	const textLineVariants = {
		hidden: {
			opacity: 0,
			y: 30,
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.8,
				ease: [0.25, 0.1, 0.25, 1] as const,
			},
		},
	};

	const cardVariants = {
		hidden: {
			opacity: 0,
			y: 20,
			scale: 0.95,
		},
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				duration: 0.6,
				ease: [0.25, 0.1, 0.25, 1] as const,
			},
		},
	};

	const backgroundVariants = {
		hidden: {
			scale: 1.1,
			opacity: 0,
		},
		visible: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 1.5,
				ease: [0.25, 0.1, 0.25, 1] as const,
			},
		},
	};

	const handleChromeExtension = () => {
		analytics.extensionInstallClicked();
		window.open(
			"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
			"_blank",
		);
	};

	const handleAddMemory = () => {
		setShowConnectAIModal(false);
		if (setShowAddMemoryView) {
			setShowAddMemoryView(true);
		}
	};

	return (
		<div className="fixed inset-0 overflow-hidden bg-black">
			<AnimatePresence>
				{!imageLoaded && (
					<motion.div
						className="absolute inset-0 bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center z-[1000]"
						exit={{ opacity: 0 }}
						initial={{ opacity: 1 }}
						transition={{ duration: 0.5 }}
					>
						<motion.div
							animate={{
								opacity: [0.3, 1, 0.3],
								scale: [1, 1.05, 1],
							}}
							className="text-white/80 text-xl font-medium tracking-widest"
							transition={{
								duration: 2,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						>
							SUPERMEMORY
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{imageLoaded && (
				<>
					<motion.div
						animate="visible"
						className="absolute inset-0 bg-cover bg-center bg-no-repeat"
						initial="hidden"
						style={{
							backgroundImage: "url('/images/onboarding.png')",
						}}
						variants={backgroundVariants}
					/>

					<motion.div
						animate={{ opacity: 1 }}
						className="absolute inset-0"
						initial={{ opacity: 0 }}
						style={{
							background: `
								radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
								linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)
							`,
						}}
						transition={{ duration: 1, delay: 0.5 }}
					/>

					<AnimatePresence>
						{showContent && (
							<motion.div
								animate="visible"
								className="relative h-screen grid grid-cols-1 lg:grid-cols-2 items-center p-6 md:p-16 gap-8 lg:gap-16 max-w-7xl mx-auto"
								initial="hidden"
								variants={containerVariants}
							>
								{/* Left Column - Quote */}
								<motion.div
									className="flex flex-col justify-center order-2 lg:order-1"
									variants={leftColumnVariants}
								>
									<motion.div
										className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-none text-white mb-2 md:mb-4 tracking-tight font-space-grotesk"
										style={{
											textShadow: "0 8px 32px rgba(0,0,0,0.6)",
										}}
										variants={textLineVariants}
									>
										<span
											className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent"
											style={{
												filter: "drop-shadow(0 0 20px rgba(255,255,255,0.1))",
											}}
										>
											Intelligence without memory
										</span>
									</motion.div>

									<motion.div
										className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-none text-white mb-2 md:mb-4 tracking-tight font-space-grotesk"
										style={{
											textShadow: "0 8px 32px rgba(0,0,0,0.6)",
										}}
										variants={textLineVariants}
									>
										<span
											className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent"
											style={{
												filter: "drop-shadow(0 0 20px rgba(255,255,255,0.1))",
											}}
										>
											is just sophisticated
										</span>
									</motion.div>

									<motion.div
										className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-none tracking-tight font-space-grotesk"
										style={{
											textShadow: "0 8px 32px rgba(0,0,0,0.6)",
										}}
										variants={textLineVariants}
									>
										<span
											className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent"
											style={{
												filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))",
											}}
										>
											randomness
										</span>
									</motion.div>
								</motion.div>

								{/* Right Column - Actions */}
								<motion.div
									className="flex md:flex-col justify-center order-1 lg:order-2 flex-col-reverse"
									variants={rightColumnVariants}
								>
									{/* Mobile Chrome Extension Link */}
									<motion.p
										className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline cursor-pointer mb-4 lg:hidden text-center mt-4 md:mt-0"
										onClick={handleChromeExtension}
										variants={textLineVariants}
									>
										Download Chrome extension to use with ChatGPT
									</motion.p>

									<div className="flex flex-col gap-5">
										{/* Chrome Extension Card - Hidden on mobile */}
										<motion.button
											className="hidden lg:flex bg-white/8 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-left cursor-pointer transition-all duration-300 items-center gap-4 hover:bg-white/12 hover:border-white/20"
											onClick={handleChromeExtension}
											variants={cardVariants}
											whileHover={{
												scale: 1.02,
												y: -2,
												transition: { duration: 0.2, ease: "easeOut" },
											}}
											whileTap={{ scale: 0.98 }}
										>
											<Chrome
												className="text-amber-500 flex-shrink-0"
												size={24}
											/>
											<div className="flex-1">
												<h3 className="text-lg font-semibold text-white mb-1">
													Add to Chrome
												</h3>
												<p className="text-sm text-white/70 leading-relaxed">
													Save items and use supermemory with ChatGPT and other
													apps. Import your ChatGPT memories, twitter bookmarks,
													and other data.
												</p>
											</div>
											<ExternalLink
												className="text-white/50 flex-shrink-0"
												size={16}
											/>
										</motion.button>

										{/* Connect AI Card */}
										<ConnectAIModal
											onOpenChange={setShowConnectAIModal}
											open={showConnectAIModal}
										>
											<motion.div
												className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-left cursor-pointer transition-all duration-300 flex items-center gap-4 hover:bg-white/12 hover:border-white/20"
												variants={cardVariants}
												whileHover={{
													scale: 1.02,
													y: -2,
													transition: { duration: 0.2, ease: "easeOut" },
												}}
												whileTap={{ scale: 0.98 }}
											>
												<Brain
													className="text-blue-500 flex-shrink-0"
													size={24}
												/>
												<div className="flex-1">
													<h3 className="text-lg font-semibold text-white mb-1">
														Connect to AI
													</h3>
													<p className="text-sm text-white/70 leading-relaxed">
														Set up your AI connection for intelligent assistance
													</p>
												</div>
											</motion.div>
										</ConnectAIModal>

										{/* Add Memory Card */}
										<motion.button
											className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-left cursor-pointer transition-all duration-300 flex items-center gap-4 hover:bg-white/12 hover:border-white/20"
											onClick={handleAddMemory}
											variants={cardVariants}
											whileHover={{
												scale: 1.02,
												y: -2,
												transition: { duration: 0.2, ease: "easeOut" },
											}}
											whileTap={{ scale: 0.98 }}
										>
											<Plus
												className="text-emerald-500 flex-shrink-0"
												size={24}
											/>
											<div className="flex-1">
												<h3 className="text-lg font-semibold text-white mb-1">
													Add Memory
												</h3>
												<p className="text-sm text-white/70 leading-relaxed">
													Start building your knowledge base
												</p>
											</div>
										</motion.button>
									</div>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				</>
			)}
		</div>
	);
};
