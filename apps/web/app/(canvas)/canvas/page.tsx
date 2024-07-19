import React from "react";
import { getCanvas } from "@/app/actions/fetchers";
import SearchandCreate from "./search&create";
import ThinkPads from "./thinkPads";

async function page() {
	const canvas = await getCanvas();
	return (
		<div className="h-screen w-full py-32 text-[#FFFFFF] ">
			<div className="flex w-full flex-col items-center gap-8">
				<h1 className="text-4xl font-medium">Your thinkpads</h1>
				<SearchandCreate />
				{
					// @ts-ignore
					canvas.success && <ThinkPads data={canvas.data} />
				}
			</div>
		</div>
	);
}

export default page;
