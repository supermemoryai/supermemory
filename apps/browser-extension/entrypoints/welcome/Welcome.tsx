import { getSupermemoryLoginUrl } from "../../utils/constants"

const featureCards = [
	{
		number: "01",
		title: "Save any page",
		description: "Articles, docs, and references from the browser.",
	},
	{
		number: "02",
		title: "Import X bookmarks",
		description: "Bring saved posts into your memory library.",
	},
	{
		number: "03",
		title: "Capture AI chats",
		description: "Save useful conversations from ChatGPT, Claude, and Gemini.",
	},
	{
		number: "04",
		title: "Use context anywhere",
		description: "Search and reuse memories when you need them.",
	},
]

function Welcome() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[#05080D] text-white font-[Space_Grotesk,-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,sans-serif]">
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"linear-gradient(180deg, #05080D 0%, #05070A 48%, #060A18 100%)",
				}}
			/>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.20)_1px,transparent_1px)] bg-size-[32px_32px] opacity-70 mask-[linear-gradient(to_bottom,transparent_0%,black_12%,black_100%)]" />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(ellipse_at_bottom,rgba(20,65,255,0.42),transparent_68%)]" />

			<main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10">
				<header className="flex items-center border-b border-white/10 pb-5">
					<div className="flex items-center gap-2">
						<img alt="" className="size-8 rounded-[4px]" src="./new_logo.png" />
						<span className="text-lg font-semibold leading-none text-white">
							supermemory
						</span>
					</div>
				</header>

				<section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
					<div className="mx-auto max-w-3xl">
						<h1 className="text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-6xl">
							Your browser now has{" "}
							<span className="text-[#369BFD]">supermemory.</span>
						</h1>

						<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
							<button
								className="h-12 rounded-xl px-7 text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#36fdfd]/70"
								style={{
									background:
										"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
									boxShadow:
										"1px 1px 2px 0px #1A88FF inset, 0 2px 18px 0 rgba(54, 155, 253, 0.24)",
								}}
								onClick={() => {
									chrome.tabs.create({
										url: getSupermemoryLoginUrl(),
									})
								}}
								type="button"
							>
								Sign in to connect
							</button>
							<button
								className="h-12 rounded-xl border border-[#369BFD]/25 bg-[#080B0F]/80 px-6 text-sm font-semibold text-[#C7D7F2] transition hover:border-[#369BFD]/50 hover:bg-[#0D121A] focus:outline-none focus:ring-2 focus:ring-[#369BFD]/30"
								onClick={() => {
									chrome.tabs.create({
										url: "https://supermemory.ai",
									})
								}}
								type="button"
							>
								Open supermemory.ai
							</button>
						</div>
					</div>

					<div className="mt-14 grid w-full max-w-5xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
						{featureCards.map((feature) => (
							<div
								className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
								key={feature.number}
							>
								<p className="text-[11px] font-medium text-[#737373]">
									{feature.number}
								</p>
								<h2 className="mt-4 text-sm font-semibold text-white">
									{feature.title}
								</h2>
								<p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</section>

				<footer className="border-t border-white/10 py-5 text-xs text-[#737373]">
					supermemory stores your extension session locally in Chrome.
				</footer>
			</main>
		</div>
	)
}

export default Welcome
