"use client";
import { useState, useRef, useEffect } from "react";
import FUIFeatureSectionWithCards from "./FeatureCardContent";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Features() {
	const [tab, setTab] = useState<number>(0);

	const tabs = useRef<HTMLDivElement>(null);

	const heightFix = () => {
		if (tabs.current && tabs.current.parentElement)
			tabs.current.parentElement.style.height = `${tabs.current.clientHeight}px`;
	};

	function handleClickIndex(tab: number) {
		setTab(tab);
	}

	useEffect(() => {
		heightFix();
	}, []);

	return (
		<section
			id="features"
			className="overflow-hidden relative w-full max-lg:after:hidden mt-10"
		>
			<img
				src="/images/tailwind-bg-gradient.avif"
				className="absolute -top-0 left-10 opacity-40 z-2"
			/>
			<div className="relative ">
				<div className="flex relative flex-col px-4 mx-auto max-w-screen-xl md:px-0">
					<div className="relative mx-auto mb-5 space-y-4 max-w-3xl text-center">
						<h2 className="pt-16 text-4xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr via-white md:text-5xl lg:text-6xl font-nomral font-geist from-zinc-400/50 to-white/60">
							A "Second brain" made for you... or your team
						</h2>

						<p className="text-zinc-400">
							Supermemory offers all the vital building blocks you need to
							transform your gold mine of content into a powerful knowledgebase
							for yourself, your team or even a group of friends!
						</p>
						<Link
							href="/signin"
							className="mx-auto flex gap-2 justify-center items-center py-2 px-10 mt-4 text-lg tracking-tighter text-center bg-gradient-to-br rounded-md ring-2 ring-offset-1 transition-all hover:ring-transparent group w-fit font-geist bg-page-gradient text-md from-zinc-400 to-zinc-700 text-zinc-50 ring-zinc-500/50 ring-offset-zinc-950/5 hover:scale-[1.02] active:scale-[0.98] active:ring-zinc-500/70"
						>
							Get Started
							<div className="overflow-hidden relative ml-1 w-5 h-5">
								<ArrowUpRight className="absolute transition-all duration-500 group-hover:translate-x-4 group-hover:-translate-y-5" />
								<ArrowUpRight className="absolute transition-all duration-500 -translate-x-4 -translate-y-5 group-hover:translate-x-0 group-hover:translate-y-0" />
							</div>
						</Link>
					</div>
					<FUIFeatureSectionWithCards />
					<div className="overflow-x-hidden overflow-y-hidden">
						<div
							className="absolute left-0 top-[60%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-20  blur-[337.4px]"
							style={{ transform: "rotate(-30deg)" }}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
