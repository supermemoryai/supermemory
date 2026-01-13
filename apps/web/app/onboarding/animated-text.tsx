"use client"
import { useEffect } from "react"
import { TextEffect } from "@/components/text-effect"

export function AnimatedText({
	children,
	trigger,
	delay,
}: {
	children: string
	trigger: boolean
	delay: number
}) {
	const blurSlideVariants = {
		container: {
			hidden: { opacity: 0 },
			visible: {
				opacity: 1,
				transition: { staggerChildren: 0.01 },
			},
			exit: {
				transition: { staggerChildren: 0.01, staggerDirection: 1 },
			},
		},
		item: {
			hidden: {
				opacity: 0,
				filter: "blur(10px) brightness(0%)",
				y: 0,
			},
			visible: {
				opacity: 1,
				y: 0,
				filter: "blur(0px) brightness(100%)",
				transition: {
					duration: 0.4,
				},
			},
			exit: {
				opacity: 0,
				y: -30,
				filter: "blur(10px) brightness(0%)",
				transition: {
					duration: 0.3,
				},
			},
		},
	}

	return (
		<TextEffect
			className="inline-flex font-medium"
			style={{ letterSpacing: "-3px" }}
			per="char"
			variants={blurSlideVariants}
			trigger={trigger}
			delay={delay}
		>
			{children}
		</TextEffect>
	)
}
