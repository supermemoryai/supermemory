"use client"

import { dmSans125ClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"
import { ArrowUpRight } from "lucide-react"

const FAQS = [
	{
		question: "How do I upgrade to Pro?",
		answer:
			'Go to the Billing tab in settings and click "Upgrade to Pro". You\'ll be redirected to our secure payment processor.',
	},
	{
		question: "What's included in the Pro plan?",
		answer:
			'Go to the Billing tab in settings and click "Upgrade to Pro". You\'ll be redirected to our secure payment processor.',
	},
	{
		question: "How do connections work?",
		answer:
			"Connections let you sync documents from Google Drive, Notion, and OneDrive automatically. supermemory will index and make them searchable.",
	},
	{
		question: "Can I cancel my subscription anytime?",
		answer:
			"Yes. You can cancel anytime from the Billing tab. Your Pro features will remain active until the end of your billing period.",
	},
]

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA] px-2",
			)}
		>
			{children}
		</p>
	)
}

function SupportCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				"relative bg-[#14161A] rounded-[14px] p-6 w-full overflow-hidden",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			{children}
		</div>
	)
}

function PillButton({
	children,
	onClick,
	className,
}: {
	children: React.ReactNode
	onClick?: () => void
	className?: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex items-center justify-center gap-2",
				"bg-[#0D121A]",
				"rounded-full h-11 px-4 flex-1",
				"cursor-pointer transition-opacity hover:opacity-80",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
				dmSans125ClassName(),
				className,
			)}
		>
			{children}
		</button>
	)
}

export default function Support() {
	const handleMessageOnX = () => {
		window.open("https://x.com/supermemory", "_blank", "noopener,noreferrer")
	}

	const handleSendEmail = () => {
		window.location.href = "mailto:support@supermemory.com"
	}

	const handleJoinDiscord = () => {
		window.open(
			"https://supermemory.link/discord",
			"_blank",
			"noopener,noreferrer",
		)
	}

	const handleShareFeedback = () => {
		window.open("https://x.com/supermemory", "_blank", "noopener,noreferrer")
	}

	return (
		<div className="flex flex-col gap-8 pt-4 w-full">
			{/* Support & Help Section */}
			<section className="flex flex-col gap-4">
				<SectionTitle>Support &amp; Help</SectionTitle>
				<SupportCard>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-normal text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
								)}
							>
								Get help
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
								)}
							>
								Need assistance? We're here to help! Choose the best way to
								reach us.
							</p>
						</div>
						<div className="flex flex-col sm:flex-row gap-4">
							<PillButton onClick={handleMessageOnX}>
								<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
									Message us on X
								</span>
								<ArrowUpRight className="size-4 text-[#FAFAFA]" />
							</PillButton>
							<PillButton onClick={handleJoinDiscord}>
								<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
									Join our Discord
								</span>
								<ArrowUpRight className="size-4 text-[#FAFAFA]" />
							</PillButton>
							<PillButton onClick={handleSendEmail}>
								<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
									Send us an email
								</span>
								<ArrowUpRight className="size-4 text-[#FAFAFA]" />
							</PillButton>
						</div>
					</div>
				</SupportCard>
			</section>

			{/* FAQ Section */}
			<section className="flex flex-col gap-4">
				<SectionTitle>Frequently Asked Questions</SectionTitle>
				<SupportCard>
					<div className="flex flex-col gap-6">
						{FAQS.map((faq, index) => (
							<div key={faq.question}>
								<div className="flex flex-col gap-1">
									<p
										className={cn(
											dmSans125ClassName(),
											"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
										)}
									>
										{faq.question}
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
										)}
									>
										{faq.answer}
									</p>
								</div>
								{index < FAQS.length - 1 && (
									<div className="bg-[#1F2125] h-px w-full mt-6" />
								)}
							</div>
						))}
					</div>
				</SupportCard>
			</section>

			{/* Feedback Section */}
			<section className="flex flex-col gap-4">
				<SectionTitle>Feedback &amp; Feature Requests</SectionTitle>
				<SupportCard>
					<div className="flex flex-col gap-4">
						<p
							className={cn(
								dmSans125ClassName(),
								"font-normal text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
							)}
						>
							Have ideas for new features or improvements? We'd love to hear
							from you!
						</p>
						<PillButton
							onClick={handleShareFeedback}
							className="w-full flex-none"
						>
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								Share your feedback on X/Twitter
							</span>
							<ArrowUpRight className="size-4 text-[#FAFAFA]" />
						</PillButton>
					</div>
				</SupportCard>
			</section>
		</div>
	)
}
