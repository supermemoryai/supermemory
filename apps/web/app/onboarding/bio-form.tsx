"use client"

import { Textarea } from "@ui/components/textarea"
import { useOnboarding } from "./onboarding-context"
import { useState } from "react"
import { Button } from "@ui/components/button"
import { AnimatePresence, motion } from "motion/react"
import { NavMenu } from "./nav-menu"
import { $fetch } from "@lib/api"

export function BioForm() {
	const [bio, setBio] = useState("")
	const { totalSteps, nextStep, getStepNumberFor } = useOnboarding()

	function handleNext() {
		const trimmed = bio.trim()
		if (!trimmed) {
			nextStep()
			return
		}

		nextStep()
		void $fetch("@post/documents", {
			body: {
				content: trimmed,
				containerTags: ["sm_project_default"],
				metadata: { sm_source: "consumer" },
			},
		}).catch((error) => {
			console.error("Failed to save onboarding bio memory:", error)
		})
	}
	return (
		<div className="relative w-full">
			<div className="space-y-4 relative">
				<div className="absolute top-0 right-0">
					<AnimatePresence mode="sync">
						{bio ? (
							<motion.div
								key="save"
								initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
								animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
								exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
								transition={{ duration: 0.2, ease: "easeOut" }}
							>
								<Button
									variant="link"
									size="lg"
									className="text-white/60 font-medium! text-base md:text-lg w-fit px-0! cursor-pointer"
									onClick={handleNext}
								>
									Save & Continue
								</Button>
							</motion.div>
						) : (
							<motion.div
								key="skip"
								initial={{ opacity: 0, filter: "blur(5px)" }}
								animate={{ opacity: 1, filter: "blur(0px)" }}
								exit={{ opacity: 0, filter: "blur(5px)" }}
								transition={{ duration: 0.2, ease: "easeOut" }}
							>
								<Button
									variant="link"
									size="lg"
									className="text-white/60 font-medium! text-base md:text-lg w-fit px-0! cursor-pointer"
									onClick={handleNext}
								>
									Skip For Now
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
				<NavMenu>
					<p className="text-base text-white/60">
						Step {getStepNumberFor("bio")} of {totalSteps}
					</p>
				</NavMenu>
				<h1 className="text-2xl md:text-4xl text-white font-medium">
					Tell Supermemory about yourself
				</h1>
				<p className="text-lg md:text-xl text-white/80">
					share with Supermemory what you do, who you are, and what you're interested in
				</p>
			</div>
			<Textarea
				autoFocus
				className="font-sans mt-6 text-base! placeholder:text-white/80 text-white tracking-normal font-medium border bg-white/30 border-zinc-200 rounded-lg !field-sizing-normal !min-h-[calc(3*1.5rem+1rem)] w-full"
				placeholder="I'm a software engineer from San Francisco..."
				rows={3}
				value={bio}
				onChange={(e) => setBio(e.target.value)}
			/>
		</div>
	)
}
