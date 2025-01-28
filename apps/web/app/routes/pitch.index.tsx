import React, { useEffect } from "react";

import posthog from "posthog-js";
import { Logo } from "~/components/icons/Logo";
import { Theme, useTheme } from "~/lib/theme-provider";

function PitchPage1() {
	return (
		<div className="h-screen w-screen flex flex-col justify-center px-4 sm:px-8">
			<Logo className="w-[min(25vw,16rem)] h-[min(25vw,16rem)] mb-4" />
			<div className="w-full max-w-[90vw]">
				<h1 className="text-[min(10vw,12rem)] font-bold tracking-tight leading-none whitespace-nowrap">
					<span className="inline">super</span>
					<span className="inline">memory</span>
				</h1>
                <p className="text-[min(3vw,3rem)] font-medium tracking-tight leading-none mt-8">
                    The second brain platform for everyone. <br />
                    <span className="text-[min(1.5vw,1rem)] text-gray-500">dhravya shah draft</span>
                </p>
			</div>
		</div>
	);
}

function PitchPage2() {
	return (
		<div className="h-screen w-screen flex flex-col justify-center px-4 sm:px-8">
			<h2 className="text-[min(5vw,4rem)] font-bold tracking-tight leading-none mb-12">current problems</h2>
			<div className="grid grid-cols-4 gap-4 max-w-7xl mx-auto w-full h-[60vh] relative">
				<div className="absolute -right-24 top-1/2 -translate-y-1/2 w-48">
					<img 
						src="https://www.harleytherapy.co.uk/counselling/wp-content/uploads/4624465693_115ce5fa02-400x300.jpg"
						alt="Messy desk with papers"
						className="rounded-lg shadow-lg"
					/>
					<div className="font-handwritten text-lg text-blue-600 -rotate-12 mt-2 ml-4">
						current knowledgebase
						<svg className="w-12 h-12 -mt-2 ml-2 transform rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M5 12h14M12 5l7 7-7 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
					</div>
				</div>

				<div className="col-span-2 row-span-2 border rounded-xl p-8 hover:bg-gray-50 transition-colors transform hover:scale-105 hover:rotate-1">
					<h3 className="font-semibold text-3xl mb-4">Knowledge Management</h3>
					<p className="text-gray-600 text-lg">Information overload is real. Notes scattered everywhere, bookmarks lost in endless folders, important details buried in email threads. We're building this for Chakshu who's drowning in digital chaos.</p>
				</div>
				<div className="border rounded-xl p-6 hover:bg-gray-50 transition-colors transform hover:-rotate-2">
					<h3 className="font-semibold text-xl mb-2">Trust & Privacy</h3>
					<p className="text-gray-600 text-sm">Developer friends like Kshunya and Siddharth need their data private and secure</p>
				</div>
				<div className="border rounded-xl p-6 hover:bg-gray-50 transition-colors transform hover:rotate-2">
					<h3 className="font-semibold text-xl mb-2">Enterprise Search</h3>
					<p className="text-gray-600 text-sm">Cloudflare's internal knowledge is a maze of confusion</p>
				</div>
				<div className="col-span-2 border rounded-xl p-6 hover:bg-gray-50 transition-colors transform hover:-rotate-1">
					<h3 className="font-semibold text-2xl mb-3">Digital Chaos</h3>
					<p className="text-gray-600">Notes in Notion, bookmarks in Chrome, knowledge in Slack, wisdom in emails... it's everywhere and nowhere</p>
				</div>
				<div className="border rounded-xl p-6 hover:bg-gray-50 transition-colors transform hover:rotate-1">
					<h3 className="font-semibold text-xl mb-2">Information Anxiety</h3>
					<p className="text-gray-600 text-sm">Brent spends hours searching through old emails</p>
				</div>
				<div className="border rounded-xl p-6 hover:bg-gray-50 transition-colors transform hover:-rotate-1">
					<h3 className="font-semibold text-xl mb-2">Developer Cost</h3>
					<p className="text-gray-600 text-sm">Memory APIs are a costly maze of complexity</p>
				</div>
			</div>
		</div>
	);
}

function Pitch() {
	const [theme, setTheme] = useTheme();
	useEffect(() => {
		posthog.capture("pitch_viewed");
		setTheme(Theme.LIGHT);
	}, []);

	return (
		<div className="snap-y snap-mandatory h-screen w-screen overflow-y-auto">
			<div className="snap-start">
				<PitchPage1 />
			</div>
            <div className="snap-start">
				<PitchPage2 />
			</div>
			{/* Add more pages here with snap-start class */}
		</div>
	);
}

export default Pitch;
