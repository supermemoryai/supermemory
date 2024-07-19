"use client";
import { motion } from "framer-motion";
import ThinkPad from "./thinkPad";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

export default function ThinkPads({
	data,
}: {
	data: { image: string; title: string; description: string; id: string }[];
}) {
	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="w-[90%] max-w-2xl space-y-6"
		>
			{data.map((item) => {
				return <ThinkPad {...item} />;
			})}
		</motion.div>
	);
}
