"use client";

import { motion } from "framer-motion";
import {
	Github,
	Medium,
	Notion,
	Reddit,
	Twitter,
} from "@repo/ui/components/icons";
import Image from "next/image";

const icons = [
	<div className="rounded-full bg-purple-600/20 p-4">
		<Github className="h-8 w-8 text-purple-500" />
	</div>,
	<div className="rounded-full bg-blue-800/20 p-4">
		<Twitter className="h-8 w-8 text-blue-500" />
	</div>,
	<div className="rounded-full bg-green-800/20 p-4">
		<Medium className="h-8 w-8 text-green-500" />
	</div>,
	<div className="rounded-full bg-red-800/20 p-4">
		<Reddit className="h-8 w-8 text-red-500" />
	</div>,
	<div className="rounded-full bg-white/20 p-4">
		<Notion className="h-8 w-8 text-white" />
	</div>,
];

const RotatingIcons: React.FC = () => {
	return (
		<div className="relative flex w-full flex-col items-center justify-center gap-8 px-4 sm:px-6 mt-10">
			<motion.h1
				{...{
					transition: { delay: 0.2 },
				}}
				className="text-center max-w-2xl  mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter   text-transparent md:text-5xl lg:text-6xl"
			>
				Collect data from{" "}
				<span className="bg-gradient-to-r from-zinc-300 to-blue-200 bg-clip-text text-transparent">
					any website on the internet
				</span>
			</motion.h1>
			<div className="flex items-center justify-center">
				<div className="relative m-2 mx-auto h-96 w-96 scale-[70%] md:scale-100 ">
					<div className="relative h-full w-full rounded-full border border-gray-800">
						{icons.map((icon, index) => (
							<motion.div
								key={index}
								className="absolute top-1/2 -translate-x-10 transform"
								style={{
									originX: "200px",
									originY: "-8px",
								}}
								animate={{
									rotate: [0, 360],
								}}
								transition={{
									repeat: Infinity,
									duration: 5,
									ease: "linear",
									delay: index,
								}}
							>
								<motion.div
									style={{
										rotate: index * 72,
									}}
									animate={{
										rotate: [0, -360],
									}}
									transition={{
										repeat: Infinity,
										duration: 5,
										ease: "linear",
										delay: index,
									}}
								>
									{icon}
								</motion.div>
							</motion.div>
						))}
						<Image
							src="/logo.svg"
							alt="Supermemory logo"
							width={80}
							height={80}
							className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-white"
						/>
					</div>
				</div>
			</div>
			<p className="text-center text-sm text-zinc-500">
				... and bring it into your second brain
			</p>
		</div>
	);
};

export default RotatingIcons;
