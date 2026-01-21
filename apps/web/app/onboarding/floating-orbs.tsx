"use client"

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useState, memo } from "react"
import { useOnboarding } from "./onboarding-context"

interface OrbProps {
	size: number
	initialX: number
	initialY: number
	duration: number
	delay: number
	revealDelay: number
	shouldReveal: boolean
	color: {
		primary: string
		secondary: string
		tertiary: string
	}
}

function FloatingOrb({
	size,
	initialX,
	initialY,
	duration,
	delay,
	revealDelay,
	shouldReveal,
	color,
}: OrbProps) {
	const blurPixels = Math.min(64, Math.max(24, Math.floor(size * 0.08)))

	const gradient = useMemo(() => {
		return `radial-gradient(circle, ${color.primary} 0%, ${color.secondary} 40%, ${color.tertiary} 70%, transparent 100%)`
	}, [color.primary, color.secondary, color.tertiary])

	const style = useMemo(() => {
		return {
			width: size,
			height: size,
			background: gradient,
			filter: `blur(${blurPixels}px)`,
			willChange: "transform, opacity",
			mixBlendMode: "plus-lighter",
		} as any
	}, [size, gradient, blurPixels])

	const initial = useMemo(() => {
		return {
			x: initialX,
			y: initialY,
			scale: 0,
			opacity: 0,
		}
	}, [initialX, initialY])

	const animate = useMemo(() => {
		if (!shouldReveal) {
			return {
				x: initialX,
				y: initialY,
				scale: 0,
				opacity: 0,
			}
		}
		return {
			x: [initialX, initialX + 200, initialX - 150, initialX + 100, initialX],
			y: [initialY, initialY - 180, initialY + 120, initialY - 80, initialY],
			scale: [0.8, 1.2, 0.9, 1.1, 0.8],
			opacity: 0.7,
		}
	}, [shouldReveal, initialX, initialY])

	const transition = useMemo(() => {
		return {
			x: {
				duration: shouldReveal ? duration : 0,
				repeat: shouldReveal ? Number.POSITIVE_INFINITY : 0,
				ease: [0.42, 0, 0.58, 1],
				delay: shouldReveal ? delay + revealDelay : 0,
			},
			y: {
				duration: shouldReveal ? duration : 0,
				repeat: shouldReveal ? Number.POSITIVE_INFINITY : 0,
				ease: [0.42, 0, 0.58, 1],
				delay: shouldReveal ? delay + revealDelay : 0,
			},
			scale: {
				duration: shouldReveal ? duration : 0.8,
				repeat: shouldReveal ? Number.POSITIVE_INFINITY : 0,
				ease: shouldReveal ? [0.42, 0, 0.58, 1] : [0, 0, 0.58, 1],
				delay: shouldReveal ? delay + revealDelay : revealDelay,
			},
			opacity: {
				duration: 1.2,
				ease: [0, 0, 0.58, 1],
				delay: shouldReveal ? revealDelay : 0,
			},
		} as any
	}, [shouldReveal, duration, delay, revealDelay])

	return (
		<motion.div
			className="absolute rounded-full"
			style={style}
			initial={initial}
			animate={animate}
			transition={transition}
		/>
	)
}

const MemoFloatingOrb = memo(FloatingOrb)

export function FloatingOrbs() {
	const { orbsRevealed } = useOnboarding()
	const reduceMotion = useReducedMotion()
	const [mounted, setMounted] = useState(false)
	const [orbs, setOrbs] = useState<
		Array<{
			id: number
			size: number
			initialX: number
			initialY: number
			duration: number
			delay: number
			revealDelay: number
			color: {
				primary: string
				secondary: string
				tertiary: string
			}
		}>
	>([])

	useEffect(() => {
		setMounted(true)

		const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200
		const screenHeight =
			typeof window !== "undefined" ? window.innerHeight : 800

		// Define edge zones (avoiding center)
		const edgeThickness = Math.min(screenWidth, screenHeight) * 0.25 // 25% of smaller dimension

		// Define rainbow color palette
		const colorPalette = [
			{
				// Magenta
				primary: "rgba(255, 0, 150, 0.6)",
				secondary: "rgba(255, 100, 200, 0.4)",
				tertiary: "rgba(255, 150, 220, 0.1)",
			},
			{
				// Yellow
				primary: "rgba(255, 235, 59, 0.6)",
				secondary: "rgba(255, 245, 120, 0.4)",
				tertiary: "rgba(255, 250, 180, 0.1)",
			},
			{
				// Light Blue
				primary: "rgba(100, 181, 246, 0.6)",
				secondary: "rgba(144, 202, 249, 0.4)",
				tertiary: "rgba(187, 222, 251, 0.1)",
			},
			{
				// Orange (keeping original)
				primary: "rgba(255, 154, 0, 0.6)",
				secondary: "rgba(255, 206, 84, 0.4)",
				tertiary: "rgba(255, 154, 0, 0.1)",
			},
			{
				// Very Light Red/Pink
				primary: "rgba(255, 138, 128, 0.6)",
				secondary: "rgba(255, 171, 145, 0.4)",
				tertiary: "rgba(255, 205, 210, 0.1)",
			},
		]

		// Generate orb configurations positioned along edges
		const newOrbs = Array.from({ length: 8 }, (_, i) => {
			let x: number
			let y: number
			const zone = i % 4 // Rotate through 4 zones: top, right, bottom, left

			switch (zone) {
				case 0: // Top edge
					x = Math.random() * screenWidth
					y = Math.random() * edgeThickness
					break
				case 1: // Right edge
					x = screenWidth - edgeThickness + Math.random() * edgeThickness
					y = Math.random() * screenHeight
					break
				case 2: // Bottom edge
					x = Math.random() * screenWidth
					y = screenHeight - edgeThickness + Math.random() * edgeThickness
					break
				case 3: // Left edge
					x = Math.random() * edgeThickness
					y = Math.random() * screenHeight
					break
				default:
					x = Math.random() * screenWidth
					y = Math.random() * screenHeight
			}

			return {
				id: i,
				size: Math.random() * 300 + 200, // 200px to 500px
				initialX: x,
				initialY: y,
				duration: Math.random() * 20 + 15, // 15-35 seconds (longer for more gentle movement)
				delay: i * 0.4, // Staggered start for floating animation
				revealDelay: i * 0.2, // Faster staggered reveal
				color: colorPalette[i % colorPalette.length]!, // Cycle through rainbow colors
			}
		})

		setOrbs(newOrbs)
	}, [])

	if (!mounted || orbs.length === 0) return null

	return (
		<div
			className="fixed inset-0 pointer-events-none overflow-hidden"
			style={{ isolation: "isolate", contain: "paint" }}
		>
			{orbs.map((orb) => (
				<MemoFloatingOrb
					key={orb.id}
					size={orb.size}
					initialX={orb.initialX}
					initialY={orb.initialY}
					duration={reduceMotion ? 0 : orb.duration}
					delay={orb.delay}
					revealDelay={orb.revealDelay}
					shouldReveal={reduceMotion ? false : orbsRevealed}
					color={orb.color}
				/>
			))}
		</div>
	)
}
