"use client"

import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import Image from "next/image"

interface XBookmarksDetailViewProps {
	onBack: () => void
}

const steps = [
	{
		number: 1,
		title: "Install the Chrome Extension and login with your supermemory",
		image: "/onboarding/chrome-ext-1.png",
	},
	{
		number: 2,
		title: "Visit the bookmarks tab on X and one-click import your bookmarks",
		image: "/onboarding/chrome-ext-2.png",
	},
	{
		number: 3,
		title: "Talk to your bookmarks via Nova & see it in your memory graph",
		image: "/onboarding/chrome-ext-3.png",
	},
]

export function XBookmarksDetailView({
	onBack,
}: XBookmarksDetailViewProps) {
	const handleInstall = () => {
		window.open(
			"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnangednailhoegogi",
			"_blank",
		)
	}

	return (
		<div className="flex flex-col h-full p-8">
			<div className="mb-6">
				<Button
					variant="link"
					className="text-white hover:text-gray-300 p-0 hover:no-underline cursor-pointer"
					onClick={onBack}
				>
					← Back
				</Button>
			</div>

			<div className="flex flex-col items-start justify-start flex-1">
				<div>
					<h1 className="text-white text-[20px] font-medium mb-3 text-start">
						Import your X bookmarks via the Chrome Extension
					</h1>

					<p
						className={cn(
							"text-[#8B8B8B] text-sm mb-6 text-start max-w-2xl",
							dmSansClassName(),
						)}
					>
						Bring your X bookmarks into Supermemory in just a few clicks.
						They'll be automatically embedded so you can easily find what you
						need, right when you need it.
					</p>

					<div className="grid grid-cols-3 gap-4 mb-6 max-w-5xl w-full">
						{steps.map((step) => (
							<div
								key={step.number}
								className="flex flex-col items-center text-center bg-[#080B0F] p-3 rounded-[10px]"
							>
								<div className="rounded-2xl p-6 mb-3 w-full aspect-4/4 flex items-center justify-center relative overflow-hidden">
									<Image
										src={step.image}
										alt={`Step ${step.number}`}
										fill
										className="object-cover"
										unoptimized
									/>
								</div>
								<div className="flex flex-col items-start justify-start">
									<div className="mb-2">
										<span className="text-white text-sm font-medium">
											Step {step.number}
										</span>
									</div>
									<p
										className={cn(
											"text-[#8B8B8B] text-sm text-start",
											dmSansClassName(),
										)}
									>
										{step.title}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				<Button
					className="rounded-xl px-4 py-2 text-white h-10 cursor-pointer mx-auto bg-black"
					onClick={handleInstall}
				>
					Install Chrome Extension →
				</Button>
			</div>
		</div>
	)
}
