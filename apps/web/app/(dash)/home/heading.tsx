import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const headings = [
	"Unlock your digital brain",
	"Save everything.",
	" Connect anything.",
	"Turn your bookmarks into insights.",
	"The smart way to use your digital treasure.",
];

export function Heading({ query = "" }: { query?: string }) {
	const [showHeading, setShowHeading] = useState<number>(0);

	useEffect(() => {
		setShowHeading(Math.floor(Math.random() * headings.length));
	});
	return (
		<div className="h-[3.4rem] overflow-hidden text-white text-center">
			<motion.h1
				animate={{ opacity: query ? 0 : 1, y: query ? "20%" : 0 }}
				className={`text-[2.45rem] font-semibold ${
					query ? "opacity-0 " : "opacity-100"
				} transition-opacity`}
			>
				{headings[showHeading]}
			</motion.h1>
		</div>
	);
}
