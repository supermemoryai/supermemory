"use client"

import { useEffect, useRef } from "react"
import { useQueryState } from "nuqs"

const COLORS = ["#4BA0FA", "#FF8A47", "#B19CFF", "#10A37F", "#fafafa"]

export function OnboardingConfetti() {
	const [onboarded, setOnboarded] = useQueryState("onboarded")
	const fired = useRef(false)

	useEffect(() => {
		if (onboarded !== "1" || fired.current) return
		fired.current = true
		setOnboarded(null)

		const reduceMotion = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		).matches
		if (reduceMotion) return

		let raf = 0
		const run = async () => {
			const confetti = (await import("canvas-confetti")).default
			const end = Date.now() + 1400
			const frame = () => {
				confetti({
					particleCount: 4,
					angle: 60,
					spread: 70,
					startVelocity: 55,
					origin: { x: 0, y: 0.7 },
					colors: COLORS,
				})
				confetti({
					particleCount: 4,
					angle: 120,
					spread: 70,
					startVelocity: 55,
					origin: { x: 1, y: 0.7 },
					colors: COLORS,
				})
				if (Date.now() < end) raf = requestAnimationFrame(frame)
			}
			frame()
		}
		run()

		return () => cancelAnimationFrame(raf)
	}, [onboarded, setOnboarded])

	return null
}
