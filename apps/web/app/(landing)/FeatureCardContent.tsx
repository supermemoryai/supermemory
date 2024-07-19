import { Twitter } from "@repo/ui/components/icons";
import { GlareCard } from "./CardPatterns/Glare";
import React from "react";
import { MessageCircle, Search } from "lucide-react";

export default function FUIFeatureSectionWithCards() {
	const features = [
		{
			icon: <Twitter className="w-5 h-5" />,
			title: "Twitter Bookmarks",
			desc: "Use all the knowledge you've saved on Twitter to train your own supermemory..",
		},
		{
			icon: <Search className="w-5 h-5" />,
			title: "Powerful search",
			desc: "Look up anything you've saved in your supermemory, and get the information you need in seconds.",
		},
		{
			icon: <MessageCircle className="w-5 h-5" />,
			title: "Chat with collections",
			desc: "Use collections to talk to specific knowledgebases like 'My twitter bookmarks', or 'Learning web development'",
		},
		{
			icon: (
				<svg
					fill="currentColor"
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="16"
				>
					<path d="M13 0H1C.4 0 0 .4 0 1v14c0 .6.4 1 1 1h8l5-5V1c0-.6-.4-1-1-1ZM2 2h10v8H8v4H2V2Z" />
				</svg>
			),
			title: "Knowledge canvas",
			desc: " Arrange your saved information in a way that makes sense to youin a 2d canvas.",
		},
		{
			icon: (
				<svg
					fill="currentColor"
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
				>
					<path d="M14.6.085 8 2.885 1.4.085c-.5-.2-1.4-.1-1.4.9v11c0 .4.2.8.6.9l7 3c.3.1.5.1.8 0l7-3c.4-.2.6-.5.6-.9v-11c0-1-.9-1.1-1.4-.9ZM2 2.485l5 2.1v8.8l-5-2.1v-8.8Zm12 8.8-5 2.1v-8.7l5-2.1v8.7Z" />
				</svg>
			),
			title: "Just... bookmarks",
			desc: "AI is cool, but sometimes you just need a place to save your stuff. Supermemory is that place.",
		},
		{
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					className="w-5 h-"
				>
					<path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
				</svg>
			),
			title: "Writing assistant",
			desc: " Use our markdown editor to write content based on your saved data, with the help of AI.",
		},
	];

	return (
		<section className="relative z-20 pb-14">
			<div className="px-4 mx-auto max-w-screen-xl text-gray-400 md:px-8 lg:px-0">
				<div className="relative mx-auto max-w-2xl sm:text-center">
					<div className="relative z-10">
						<h3 className="mt-4 text-3xl font-normal tracking-tighter text-gray-200 sm:text-4xl md:text-5xl font-geist"></h3>
					</div>
					<div
						className="absolute inset-0 mx-auto max-w-xs h-44 blur-[118px]"
						style={{
							background:
								"linear-gradient(152.92deg, rgba(192, 132, 252, 0.2) 4.54%, rgba(232, 121, 249, 0.26) 34.2%, rgba(192, 132, 252, 0.1) 77.55%)",
						}}
					></div>
				</div>
				<div className="relative z-20 mt-[4rem]">
					<ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((item, idx) => (
							<GlareCard key={`l-${idx}`}>
								<li
									key={idx}
									className="z-20 transform-gpu space-y-3 rounded-xl border  border-white/10 bg-transparent/20 p-4 [border:1px_solid_rgba(255,255,255,.1)] [box-shadow:0_-20px_80px_-20px_#8686f01f_inset]"
								>
									<div className="w-fit transform-gpu rounded-full p-4 text-purple-600 dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset]">
										{item.icon}
									</div>
									<h4 className="text-lg font-bold tracking-tighter text-gray-300 font-geist">
										{item.title}
									</h4>
									<p className="text-gray-500">{item.desc}</p>
								</li>
							</GlareCard>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}
