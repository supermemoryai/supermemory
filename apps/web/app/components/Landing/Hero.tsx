"use client";

import { DiscordIcon, GithubIcon } from "../icons/IntegrationIcons";
import { Logo } from "../icons/Logo";

interface PlusPatternBackgroundProps {
	plusSize?: number;
	plusColor?: string;
	backgroundColor?: string;
	className?: string;
	style?: React.CSSProperties;
	fade?: boolean;
	[key: string]: any;
}

export const BackgroundPlus: React.FC<PlusPatternBackgroundProps> = ({
	plusColor = "#CCE5FF",
	backgroundColor = "transparent",
	plusSize = 60,
	className,
	fade = true,
	style,
	...props
}) => {
	const encodedPlusColor = encodeURIComponent(plusColor);

	const maskStyle: React.CSSProperties = fade
		? {
				maskImage: "radial-gradient(circle, white 10%, transparent 90%)",
				WebkitMaskImage: "radial-gradient(circle, white 10%, transparent 90%)",
			}
		: {};

	const backgroundStyle: React.CSSProperties = {
		backgroundColor,
		backgroundImage: `url("data:image/svg+xml,%3Csvg width='${plusSize}' height='${plusSize}' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${encodedPlusColor}' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
		...maskStyle,
		...style,
	};

	return (
		<div
			className={`absolute inset-0 h-full w-full opacity-50 ${className}`}
			style={backgroundStyle}
			{...props}
		></div>
	);
};

export default function Hero() {
	return (
		<div className="relative z-[10] min-h-screen overflow-hidden">
			<div className="fixed bottom-0 left-0 right-0 flex justify-center z-[45] pointer-events-none">
				<div
					className="h-48 w-[95%] overflow-x-hidden bg-[#3B82F6] bg-opacity-100 md:bg-opacity-70 blur-[400px]"
					style={{ transform: "rotate(-30deg)" }}
				/>
			</div>
			<BackgroundPlus />

			{/* Header */}
			<header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100/20">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16 md:h-20">
						{/* Left section */}
						<div className="flex items-center space-x-8">
							<div className="inline-flex gap-2 items-center">
								<Logo />
								<span className="text-lg lg:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
									supermemory.ai
								</span>
							</div>
							<nav className="hidden lg:flex items-center space-x-8">
								{/* Products dropdown commented out for now
                <Popover className="relative">
                  ...
                </Popover>
                */}

								<a
									href="https://docs.supermemory.ai"
									className="text-gray-600 hover:text-gray-900 transition-colors"
								>
									Docs
								</a>
							</nav>
						</div>

						{/* Right section */}
						<div className="flex items-center space-x-6">
							<div className="hidden sm:flex items-center space-x-6">
								<a
									href="https://git.new/memory"
									className="text-gray-600 hover:text-gray-900 transition-colors"
								>
									<GithubIcon className="h-6 w-6" />
								</a>
								<a
									href="https://discord.gg/b3BgKWpbtR"
									className="text-gray-600 hover:text-gray-900 transition-colors"
								>
									<DiscordIcon className="h-6 w-6" />
								</a>
							</div>
							<div className="flex items-center space-x-4">
								<a
									href="/signin"
									className="[box-shadow:0_-20px_80px_-20px_#CCE5FF_inset] bg-[#1E3A8A] text-white px-5 py-2.5 rounded-lg hover:bg-opacity-90 transition-all duration-200 hover:translate-y-[-1px]"
								>
									Get started
								</a>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<main className="pt-32 md:pt-40 relative z-[20] pb-24">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-8 items-start">
						{/* Hero Content */}
						<div className="text-left max-w-xl mx-auto lg:mx-0">
							{/* Announcement Banner */}
							<div className="flex mb-10">
								<div className="inline-flex items-center space-x-3 bg-white/90 rounded-full px-5 py-2.5 shadow-sm hover:shadow-md transition-all duration-200">
									<span className="bg-[#3B82F6] text-white text-xs px-2.5 py-1 rounded-full font-medium">
										NEW
									</span>
									<span className="text-gray-600">Top OSS Repository in 2024</span>
									<a
										href="https://runacap.com/ross-index/q3-2024/"
										className="text-[#1E3A8A] font-medium hover:text-[#3B82F6] transition-colors"
									>
										Read more →
									</a>
								</div>
							</div>
							<h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
								AI for all your knowledge.
							</h1>
							<p className="text-xl text-gray-600 mt-6 mb-8 leading-relaxed">
								Supermemory helps you collect, organize, and recall all your knowledge.
								{/* list of notable features */}
								<ul className="list-none space-y-3 mt-6">
									<li className="flex items-center space-x-3">
										<svg
											className="h-5 w-5 text-[#3B82F6]"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
										<span>Connect with your existing tools and bookmarks</span>
									</li>
									<li className="flex items-center space-x-3">
										<svg
											className="h-5 w-5 text-[#3B82F6]"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
										<span>Chat and find with AI & actually use your knowledge</span>
									</li>
									<li className="flex items-center space-x-3">
										<svg
											className="h-5 w-5 text-[#3B82F6]"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
										<span>Share your knowledge with your friends and colleagues</span>
									</li>
								</ul>
							</p>
							<div className="flex flex-col space-y-8">
								<div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
									<a
										href="/signin"
										className="w-full sm:w-auto [box-shadow:0_-20px_80px_-20px_#CCE5FF_inset] bg-gradient-to-tr from-[#1E3A8A] to-[#3B82F6] text-white px-8 py-4 rounded-xl hover:shadow-lg hover:translate-y-[-2px] transition-all duration-200 text-center font-medium"
									>
										Get started for free
									</a>
									<div className="flex items-center space-x-6 text-sm text-gray-600">
										<a
											href="https://git.new/memory"
											className="flex items-center hover:text-[#1E3A8A] transition-colors group"
										>
											<GithubIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
											GitHub
										</a>
										<a
											href="https://docs.supermemory.ai"
											className="flex items-center hover:text-[#1E3A8A] transition-colors group"
										>
											<svg
												className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
												/>
											</svg>
											Documentation
										</a>
									</div>
								</div>

								<div className="flex items-center space-x-4">
									<img
										src="/product-of-the-day.png"
										className="w-44 hover:opacity-90 transition-opacity"
										alt="Product of the Day on Product Hunt"
									/>
								</div>
							</div>
						</div>

						{/* Video Section */}
						<div className="w-full mt-24">
							<div
								style={{ position: "relative", paddingTop: "56.25%" }}
								className="rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300"
							>
								<iframe
									src="https://customer-5xczlbkyq4f9ejha.cloudflarestream.com/111c4828c3587348bc703e67bfca9682/iframe?muted=true&poster=https%3A%2F%2Fcustomer-5xczlbkyq4f9ejha.cloudflarestream.com%2F111c4828c3587348bc703e67bfca9682%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600"
									loading="lazy"
									style={{
										border: "none",
										position: "absolute",
										top: 0,
										left: 0,
										height: "100%",
										width: "100%",
									}}
									allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
									allowFullScreen={true}
								></iframe>
							</div>
						</div>
					</div>

					{/* Integration Tags */}
					<div className="mt-32">
						<div className="text-gray-900 font-medium mb-8 text-center text-lg">
							Integrate with your favorite tools
						</div>
						<div className="flex flex-wrap justify-center gap-4">
							{[
								"Notion",
								"Twitter",
								"Obsidian",
								"Reddit",
								"LinkedIn",
								"Chrome Extension",
								"iOS App",
								"Slack",
								// "Google Drive",
								// "Microsoft Teams"
							].map((tool) => (
								<div
									key={tool}
									className="bg-white/90 rounded-full px-5 py-2.5 shadow-sm hover:shadow-md hover:bg-white hover:translate-y-[-1px] transition-all duration-200 cursor-pointer"
								>
									{tool}
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
