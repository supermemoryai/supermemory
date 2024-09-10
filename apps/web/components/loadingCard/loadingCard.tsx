import { motion } from "framer-motion";

const LoadingCard = ({ pendingJobs }: { pendingJobs: number }) => {
	if (pendingJobs === 0) {
		return null;
	}

	return (
		<motion.div
			className="relative bg-[#2D2D2D] rounded-xl overflow-hidden w-full min-h-[100px] max-h-[200px]"
			animate={{
				boxShadow: [
					"0 0 0 2px rgba(186, 66, 255, 0.5)",
					"0 0 0 2px rgba(0, 225, 255, 0.8)",
					"0 0 0 2px rgba(186, 66, 255, 0.5)",
				],
			}}
			transition={{
				duration: 3,
				repeat: Infinity,
				ease: "linear",
			}}
		>
			<div className="absolute inset-0.5 bg-[#2D2D2D] rounded-xl z-10"></div>
			<div className="relative z-20 flex flex-col items-center justify-center h-full text-white p-4">
				<motion.div
					className="w-12 h-12 mb-2 rounded-full relative"
					style={{
						backgroundImage:
							"linear-gradient(rgb(186, 66, 255) 35%, rgb(0, 225, 255))",
						filter: "blur(1px)",
						boxShadow:
							"0px -4px 16px 0px rgb(186, 66, 255), 0px 4px 16px 0px rgb(0, 225, 255)",
					}}
					animate={{ rotate: 360 }}
					transition={{
						duration: 1.7,
						repeat: Infinity,
						ease: "linear",
					}}
				>
					<div
						className="absolute inset-0 rounded-full"
						style={{
							backgroundColor: "rgb(36, 36, 36)",

							filter: "blur(8px)",
						}}
					></div>
				</motion.div>

				<p className="text-base font-semibold text-center">One moment</p>
				<p className="text-xs text-gray-400 text-center">
					Saving {pendingJobs} {pendingJobs === 1 ? "memory" : "memories"} for
					you
				</p>
			</div>
		</motion.div>
	);
};

export default LoadingCard;
