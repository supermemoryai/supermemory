import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";

const poppins = Inter({ subsets: ["latin"], weight: ["600"] });

const headings = [
	"Unlock your digital brain",
	"Save everything.",
	" Connect anything.",
	"Turn your bookmarks into insights.",
	"The smart way to use your digital treasure.",
];

export function Heading({ queryPresent }: { queryPresent: boolean }) {
	const [showHeading, setShowHeading] = useState<number>(0);
	useEffect(() => {
		setShowHeading(Math.floor(Math.random() * headings.length));
	}, [queryPresent]);
	return (
		<div className="h-[7rem] flex items-end justify-center overflow-hidden text-white">
			<AnimatePresence mode="popLayout">
				{!queryPresent && (
					<motion.h1
						initial={{ opacity: 0, y: "20%" }}
						animate={{ opacity: 1, y: "0%" }}
						exit={{ opacity: 0, y: "20%", whiteSpace: "nowrap" }}
						className={`text-[2.45rem] font-semibold ${
							queryPresent ? "pointer-events-none" : "pointer-events-auto"
						} transition-opacity ${poppins.className}`}
					>
						{headings[showHeading]}
					</motion.h1>
				)}
			</AnimatePresence>
		</div>
	);
}
