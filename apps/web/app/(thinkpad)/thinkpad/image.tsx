"use client";

import { getCanvasData } from "@/app/actions/fetchers";
import { twitterCardUtil } from "@/components/canvas/custom_nodes/twittercard";
import { textCardUtil } from "@/components/canvas/custom_nodes/textcard";
import { memo, useEffect, useState } from "react";
import { Box, TldrawImage } from "tldraw";

const ImageComponent = memo(({ id }: { id: string }) => {
	const [snapshot, setSnapshot] = useState<any>();

	useEffect(() => {
		(async () => {
			setSnapshot(await getCanvasData(id));
		})();
	}, []);

	if (snapshot && snapshot.bounds) {
		const pageBounds = new Box(
			snapshot.bounds.x,
			snapshot.bounds.y,
			snapshot.bounds.w,
			snapshot.bounds.h,
		);

		return (
			<TldrawImage
				shapeUtils={[twitterCardUtil, textCardUtil]}
				snapshot={snapshot.snapshot}
				// background={false}
				darkMode={true}
				bounds={pageBounds}
				padding={0}
				scale={1}
				format="svg"
			/>
		);
	}

	return (
		<div className="w-full aspect-video bg-[#2C3439] flex justify-center items-center">
			Drew things to seee here
		</div>
	);
});

export default ImageComponent;
