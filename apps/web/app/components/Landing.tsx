import { useEffect, useRef } from "react";

import { Logo } from "./icons/Logo";

import { motion, useMotionTemplate, useScroll, useSpring, useTransform } from "framer-motion";

// Interfaces
interface Memory {
	x: number;
	y: number;
	size: number;
	type: "bookmark" | "note" | "tweet" | "doc";
	color: string;
	orbitRadius: number;
	orbitSpeed: number;
	orbitOffset: number;
	opacity: number;
}

// Components
const ProductHuntBadge = () => (
	<a
		href="https://www.producthunt.com/posts/supermemory"
		target="_blank"
		rel="noopener noreferrer"
		className="inline-block hover:opacity-90 transition-opacity"
	>
		<img
			src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=472686&theme=neutral&period=daily"
			alt="Supermemory - #1 Product of the Day on Product Hunt"
			className="h-[54px] w-[250px]"
			height="54"
			width="250"
		/>
	</a>
);

const SupermemoryBackground = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const memoriesRef = useRef<Memory[]>([]);
	const rafRef = useRef<number>();
	const centerRef = useRef({ x: 0, y: 0 });
	const circleRadiusRef = useRef(150);
	const targetRadiusRef = useRef(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			centerRef.current = {
				x: canvas.width / 2,
				y: canvas.height / 2,
			};
			targetRadiusRef.current =
				Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / 1.5;
		};

		const createMemories = () => {
			const memories: Memory[] = [];
			const types: ("bookmark" | "note" | "tweet" | "doc")[] = ["bookmark", "note", "tweet", "doc"];
			const colors = {
				bookmark: "#3B82F6",
				note: "#10B981",
				tweet: "#60A5FA",
				doc: "#818CF8",
			};

			const orbits = [250, 350, 450];
			orbits.forEach((orbitRadius, orbitIndex) => {
				const memoriesInOrbit = 8 + orbitIndex * 4;
				for (let i = 0; i < memoriesInOrbit; i++) {
					const type = types[i % 4];
					const angle = (Math.PI * 2 * i) / memoriesInOrbit;
					memories.push({
						x: centerRef.current.x + Math.cos(angle) * orbitRadius,
						y: centerRef.current.y + Math.sin(angle) * orbitRadius,
						size: 3 + Math.random() * 2,
						type,
						color: colors[type],
						orbitRadius,
						orbitSpeed: (0.1 + Math.random() * 0.05) * (1 - orbitIndex * 0.2),
						orbitOffset: angle,
						opacity: 0.15 + Math.random() * 0.15,
					});
				}
			});

			return memories;
		};

		const drawMemory = (ctx: CanvasRenderingContext2D, memory: Memory, time: number) => {
			const angle = memory.orbitOffset + time * memory.orbitSpeed;
			memory.x = centerRef.current.x + Math.cos(angle) * memory.orbitRadius;
			memory.y = centerRef.current.y + Math.sin(angle) * memory.orbitRadius;

			const dx = memory.x - centerRef.current.x;
			const dy = memory.y - centerRef.current.y;
			const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

			if (distanceFromCenter <= circleRadiusRef.current) {
				// Draw connections
				memoriesRef.current.forEach((otherMemory) => {
					if (memory === otherMemory) return;
					const connectionDx = memory.x - otherMemory.x;
					const connectionDy = memory.y - otherMemory.y;
					const connectionDistance = Math.sqrt(
						connectionDx * connectionDx + connectionDy * connectionDy,
					);

					const otherDx = otherMemory.x - centerRef.current.x;
					const otherDy = otherMemory.y - centerRef.current.y;
					const otherDistanceFromCenter = Math.sqrt(otherDx * otherDx + otherDy * otherDy);

					if (connectionDistance < 80 && otherDistanceFromCenter <= circleRadiusRef.current) {
						const opacity = (1 - connectionDistance / 80) * 0.04;
						ctx.beginPath();
						ctx.moveTo(memory.x, memory.y);
						ctx.lineTo(otherMemory.x, otherMemory.y);
						ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
						ctx.lineWidth = 0.5;
						ctx.stroke();
					}
				});

				// Draw node
				const gradient = ctx.createRadialGradient(
					memory.x,
					memory.y,
					0,
					memory.x,
					memory.y,
					memory.size * 2,
				);
				gradient.addColorStop(0, memory.color.replace(")", `,${memory.opacity})`));
				gradient.addColorStop(1, memory.color.replace(")", ",0)"));

				ctx.beginPath();
				ctx.arc(memory.x, memory.y, memory.size, 0, Math.PI * 2);
				ctx.fillStyle = gradient;
				ctx.fill();
			}
		};

		memoriesRef.current = createMemories();

		const animate = () => {
			if (!ctx || !canvas) return;

			ctx.fillStyle = "rgba(17, 24, 39, 1)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const time = Date.now() * 0.001;

			// Grow circle with easing
			const radiusDiff = targetRadiusRef.current - circleRadiusRef.current;
			if (Math.abs(radiusDiff) > 1) {
				circleRadiusRef.current += radiusDiff * 0.02;
			}

			// Create clipping region
			ctx.save();
			ctx.beginPath();
			ctx.arc(centerRef.current.x, centerRef.current.y, circleRadiusRef.current, 0, Math.PI * 2);
			ctx.clip();

			// Draw orbit paths
			[250, 350, 450].forEach((radius) => {
				ctx.beginPath();
				ctx.arc(centerRef.current.x, centerRef.current.y, radius, 0, Math.PI * 2);
				ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
				ctx.stroke();
			});

			memoriesRef.current.forEach((memory) => drawMemory(ctx, memory, time));

			ctx.restore();
			rafRef.current = requestAnimationFrame(animate);
		};

		resize();
		window.addEventListener("resize", resize);
		animate();

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			window.removeEventListener("resize", resize);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 w-full h-full"
			// style={{ background: "rgb(17, 24, 39)" }}
		/>
	);
};

export default function Landing() {
	const { scrollYProgress } = useScroll();
	const scrollProgress = useSpring(scrollYProgress);
	const boxOpacity = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);
	const boxScale = useTransform(scrollYProgress, [0.3, 0.6], [0.8, 1]);

	return (
		<div className="flex flex-col relative font-geistSans overflow-hidden items-center justify-between min-h-screen ">
			<SupermemoryBackground />

			<div className="relative w-full flex items-center min-h-[90vh] p-4 lg:p-8">
				<motion.div
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="absolute top-0 left-0 right-0 p-4 lg:p-8 flex justify-between items-center z-20"
				>
					<div className="inline-flex gap-2 items-center">
						<Logo />
						<span className="text-lg lg:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
							supermemory.ai
						</span>
					</div>
					<div className="flex items-center gap-6">
						<a
							href="https://twitter.com/supermemoryai"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hidden sm:flex items-center gap-2"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
							</svg>
							<span>Follow us</span>
						</a>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-4 py-2 rounded-full bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
						>
							Get Started
						</motion.button>
					</div>
				</motion.div>

				<div className="absolute inset-0 overflow-hidden">
					<div className="absolute inset-0 opacity-[0.02] w-full bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:4rem_4rem]" />
				</div>

				<div className="relative mx-auto max-w-5xl text-center z-10 mt-20">
					<motion.div
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ duration: 0.8 }}
					>
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 0.8, delay: 0.2 }}
							className="mb-8"
						>
							<ProductHuntBadge />
						</motion.div>

						<h1 className="text-4xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight">
							<span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-900 to-blue-700 dark:from-white dark:via-blue-200 dark:to-blue-400">
								Your second brain for all
								<br />
								your saved content
							</span>
						</h1>
						<motion.p
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 0.8, delay: 0.6 }}
							className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed"
						>
							Save anything from anywhere. Supermemory connects your bookmarks, notes, and research
							into a powerful, searchable knowledge base.
						</motion.p>
						{/* <motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 0.8, delay: 0.7 }}
							className="flex flex-col gap-4 items-center mb-12"
						>
							<div className="flex items-center gap-2 text-lg text-gray-600 dark:text-gray-400">
								<svg
									className="w-5 h-5 text-blue-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>Chrome extension for one-click saving</span>
							</div>
							<div className="flex items-center gap-2 text-lg text-gray-600 dark:text-gray-400">
								<svg
									className="w-5 h-5 text-blue-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>AI-powered search across all your content</span>
							</div>
							<div className="flex items-center gap-2 text-lg text-gray-600 dark:text-gray-400">
								<svg
									className="w-5 h-5 text-blue-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>Integrates with Notion, Twitter, and more</span>
							</div>
						</motion.div> */}
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 0.8, delay: 0.8 }}
							className="flex gap-4 justify-center"
						>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="px-8 py-4 rounded-full bg-blue-600 text-white font-medium text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
							>
								Try it free
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 8l4 4m0 0l-4 4m4-4H3"
									/>
								</svg>
							</motion.button>
							<motion.a
								href="https://github.com/dhravya/supermemory"
								target="_blank"
								rel="noopener noreferrer"
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="px-8 py-4 rounded-full border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 font-medium text-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-2"
							>
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
									<path
										fillRule="evenodd"
										d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
										clipRule="evenodd"
									/>
								</svg>
								Star on GitHub
							</motion.a>
						</motion.div>
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 0.8, delay: 1 }}
							className="mt-16 flex justify-center gap-8 items-center opacity-60"
						>
							<img
								src="/medium-logo.png"
								alt="Medium"
								className="h-8 hover:opacity-100 transition-opacity"
							/>
							<img
								src="/notion-logo.png"
								alt="Notion"
								className="h-8 hover:opacity-100 transition-opacity"
							/>
							<img
								src="/reddit-logo.png"
								alt="Reddit"
								className="h-8 hover:opacity-100 transition-opacity"
							/>
							<img
								src="/twitter-logo.png"
								alt="Twitter"
								className="h-8 hover:opacity-100 transition-opacity"
							/>
						</motion.div>
					</motion.div>
				</div>
			</div>

			<div className="relative w-full min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-blue-950 flex items-center justify-center">
				<motion.div
					style={{
						opacity: boxOpacity,
						scale: boxScale,
					}}
					className="relative w-[600px] h-[400px] rounded-2xl bg-gradient-to-br from-blue-400/10 to-blue-600/10 backdrop-blur-lg border border-blue-200/20 dark:border-blue-700/20 p-8"
				>
					<div className="absolute inset-0 bg-grid-pattern opacity-5" />
					<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
						All your knowledge in one place
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						Supermemory intelligently organizes and connects your saved content, making it easy to
						find and use when you need it.
					</p>
				</motion.div>
			</div>
		</div>
	);
}
