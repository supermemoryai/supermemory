import React, { useState } from "react";
import { ArrowLeftIcon, Cog6ToothIcon } from "@heroicons/react/16/solid";
import Link from "next/link";
import Card from "./sidepanelcard";
import { sourcesZod } from "@repo/shared-types";
import { toast } from "sonner";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type card = {
	title: string;
	type: string;
	source: string;
	content: string;
	numChunks: string;
};

function Sidepanel() {
	const [content, setContent] = useState<card[]>([]);
	return (
		<div className="h-[98vh] bg-[#1f2428] rounded-xl overflow-hidden">
			<div className="flex bg-[#2C3439] items-center py-2 px-4 mb-2 text-lg">
				<Link
					href="/thinkpad"
					className="p-2 px-4 transition-colors rounded-lg hover:bg-[#334044] flex items-center gap-2"
				>
					<ArrowLeftIcon className="h-5 w-5" />
					Back
				</Link>
			</div>
			<div className="h-full px-2">
				<div className=" p-2 h-full">
					<Search setContent={setContent} />
					<div className="py-5 space-y-4">
						{content.map((v, i) => (
							<Card {...v} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function Search({ setContent }: { setContent: (e: any) => void }) {
	return (
		<form
			className="flex justify-between items-center rounded-md bg-[#121718]"
			action={async (FormData) => {
				const search = FormData.get("search") as string;

				const sourcesFetch = await fetch("/api/canvasai", {
					method: "POST",
					body: JSON.stringify({ query: search }),
				});

				const sources = await sourcesFetch.json();

				const sourcesParsed = sourcesZod.safeParse(sources);

				if (!sourcesParsed.success) {
					console.error(sourcesParsed.error);
					toast.error("Something went wrong while getting the sources");
					return;
				}
				const filteredSourceUrls = new Set(
					sourcesParsed.data.metadata.map((source) => source.url),
				);
				const uniqueSources = sourcesParsed.data.metadata.filter((source) => {
					if (filteredSourceUrls.has(source.url)) {
						filteredSourceUrls.delete(source.url);
						return true;
					}

					return false;
				});
				setContent(
					uniqueSources.map((source) => ({
						title: source.title ?? "Untitled",
						type: source.type ?? "page",
						source: source.url ?? "https://supermemory.ai",
						content: source.description ?? "No content available",
						numChunks: sourcesParsed.data.metadata.filter(
							(f) => f.url === source.url,
						).length,
					})),
				);
			}}
		>
			<input
				name="search"
				placeholder="search memories..."
				className="w-full bg-transparent p-3 text-lg outline-none flex-grow"
				type="text"
			/>
			<button type="submit" className=" border-l-2 border-gray-600 h-full p-3">
				<MagnifyingGlassIcon className=" h-5  text-[#fff]" />
			</button>
		</form>
	);
}

export default Sidepanel;
