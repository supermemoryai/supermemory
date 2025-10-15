"use client"

import BgGrad from "./bg-grad"
import { motion } from "motion/react"

interface NovaOrbProps {
	size?: number
	className?: string
}

function NovaOrb({ size = 200, className = "" }: NovaOrbProps) {
	return (
		<div
			className={`flex items-center justify-center ${className} blur-[6px]`}
			style={{ width: `${size}px`, height: `${size}px` }}
		>
			<div
				className="rounded-full relative overflow-hidden border-[black] border-[1px]"
				style={{
					width: size,
					height: size,
					boxShadow: `${(1 * size) / 30}px ${(2 * size) / 30}px ${(4 * size) / 30}px 0 #0A0E14 inset, 0 ${(18.462 * size) / 30}px ${(5.192 * size) / 30}px 0 rgba(41, 95, 255, 0.00), 0 ${(12.115 * size) / 30}px ${(4.615 * size) / 30}px 0 rgba(41, 95, 255, 0.01), 0 ${(6.923 * size) / 30}px ${(4.038 * size) / 30}px 0 rgba(41, 95, 255, 0.05), 0 ${(2.885 * size) / 30}px ${(2.885 * size) / 30}px 0 rgba(41, 95, 255, 0.09), 0 ${(0.577 * size) / 30}px ${(1.731 * size) / 30}px 0 rgba(41, 95, 255, 0.10)`,
				}}
			>
				<div className="rotate-[30.76deg] z-[-1] absolute top-[-30%] left-[-60%]">
					<motion.div
						animate={{ rotate: 360 }}
						transition={{
							duration: 12,
							ease: "linear",
							repeat: Number.POSITIVE_INFINITY,
						}}
					>
						<BgGrad size={size * 1.8} />
					</motion.div>
				</div>
			</div>
		</div>
	)
}

export default NovaOrb
