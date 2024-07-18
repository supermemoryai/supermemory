import { useEffect, useState } from "react";
import { headings } from "./headingVariants";
import { motion } from "framer-motion"; 

const slap = {
	initial: {
		opacity: 0,
		scale: 1.1,
	},
	whileInView: { opacity: 1, scale: 1 },
	transition: {
		duration: 0.5,
		ease: "easeInOut",
	},
	viewport: { once: true },
};

export function Heading() {
	const [showHeading, setShowHeading] = useState<number>(0);

	useEffect(()=> {
		setShowHeading(Math.floor(Math.random() * headings.length));
	})
	return (
		<motion.h1
			{...{
				...slap,
				transition: { ...slap.transition, delay: 0.2 },
			}}
			className="text-center mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter   text-transparent md:text-5xl"
		>
			{headings[showHeading]!.map((v, i) => {
				return (
					<span
						key={i}
						className={
							v.type === "highlighted"
								? "bg-gradient-to-r to-blue-200 from-zinc-300 text-transparent bg-clip-text"
								: ""
						}
					>
						{v.content}
					</span>
				);
			})}
		</motion.h1>
	);
}