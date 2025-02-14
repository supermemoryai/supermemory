export default function Note() {
	return (
		<div className="bg-gradient-to-b from-white to-gray-50 py-24">
			<div className="px-6 lg:px-8">
				<div className="mx-auto max-w-2xl lg:max-w-7xl">
					<div className="max-w-4xl mx-auto">
						<div className="flex flex-col items-center mb-12">
							<div className="bg-gray-300 w-40 h-1 rounded-full mb-2" />
							<div className="text-sm text-gray-500">Today</div>
						</div>

						<div className="flex justify-center">
							<div className="relative max-w-2xl w-full">
								{/* Profile Image */}
								<div className="absolute -top-12 left-4">
									<img
										src="https://pbs.twimg.com/profile_images/1813041528278843392/u50EIuLZ_400x400.jpg"
										alt="Dhravya Shah"
										className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
									/>
								</div>

								{/* Message Bubble */}
								<div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl px-8 py-6 shadow-lg">
									<p className="text-lg leading-relaxed space-y-4">
										<span className="block">👋 Hey there! I'm Dhravya</span>

										<span className="block">
											I'm a college student who built Supermemory as a weekend project. What started
											as a simple idea has grown into something I'm really proud of, thanks to
											amazing support from the open-source community! 🚀
										</span>

										<span className="block">
											When you see "we" on the website - that's actually just me! 😅 I maintain and
											build everything myself, supported by wonderful donors and grants that help
											keep this project free and open source.
										</span>

										<span className="block">
											In this AI-driven world, I believe in augmenting human knowledge rather than
											replacing it. My goal is simple: build something that genuinely helps people
											learn and grow. 💡
										</span>

										<span className="block">
											If you'd like to follow my journey, you can find me on{" "}
											<a href="https://x.com/dhravyashah" className="underline hover:text-blue-100">
												Twitter
											</a>{" "}
											and{" "}
											<a href="https://git.new/memory" className="underline hover:text-blue-100">
												GitHub
											</a>
											. And if you believe in what we're building, consider{" "}
											<a
												href="https://github.com/sponsors/dhravya"
												className="underline hover:text-blue-100"
											>
												supporting Supermemory's development
											</a>{" "}
											❤️
										</span>
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
