"use client"

import { Button } from "@repo/ui/components/button"
import { HeadingH3Bold } from "@repo/ui/text/heading/heading-h3-bold"
import { ExternalLink, Mail, MessageCircle } from "lucide-react"

export default function SupportPage() {
	return (
		<div className="py-6 max-w-2xl">
			<h1 className="text-2xl font-bold text-foreground mb-6">
				Support & Help
			</h1>

			<div className="space-y-6">
				{/* Contact Options */}
				<div className="bg-card border border-border rounded-lg p-6 space-y-4">
					<HeadingH3Bold className="text-foreground">Get Help</HeadingH3Bold>
					<p className="text-muted-foreground text-sm">
						Need assistance? We're here to help! Choose the best way to reach
						us.
					</p>

					<div className="space-y-3">
						<Button
							className="w-full justify-start bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 border-blue-500/30"
							onClick={() =>
								window.open("https://x.com/supermemoryai", "_blank")
							}
							variant="outline"
						>
							<MessageCircle className="w-4 h-4 mr-2" />
							Message us on X (Twitter)
							<ExternalLink className="w-4 h-4 ml-auto" />
						</Button>

						<Button
							className="w-full justify-start bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 border-green-500/30"
							onClick={() =>
								window.open("mailto:dhravya@supermemory.ai", "_blank")
							}
							variant="outline"
						>
							<Mail className="w-4 h-4 mr-2" />
							Email us at dhravya@supermemory.ai
							<ExternalLink className="w-4 h-4 ml-auto" />
						</Button>
					</div>
				</div>

				{/* FAQ Section */}
				<div className="bg-card border border-border rounded-lg p-6 space-y-4">
					<HeadingH3Bold className="text-foreground">
						Frequently Asked Questions
					</HeadingH3Bold>

					<div className="space-y-4">
						<div className="space-y-2">
							<h4 className="text-foreground font-medium text-sm">
								How do I upgrade to Pro?
							</h4>
							<p className="text-muted-foreground text-sm">
								Go to the Billing tab in settings and click "Upgrade to Pro".
								You'll be redirected to our secure payment processor.
							</p>
						</div>

						<div className="space-y-2">
							<h4 className="text-foreground font-medium text-sm">
								What's included in the Pro plan?
							</h4>
							<p className="text-muted-foreground text-sm">
								Pro includes unlimited memories (vs 200 in free), 10 connections to
								external services like Google Drive and Notion, advanced search
								features, and priority support.
							</p>
						</div>

						<div className="space-y-2">
							<h4 className="text-foreground font-medium text-sm">
								How do connections work?
							</h4>
							<p className="text-muted-foreground text-sm">
								Connections let you sync documents from Google Drive, Notion,
								and OneDrive automatically. supermemory will index and make them
								searchable.
							</p>
						</div>

						<div className="space-y-2">
							<h4 className="text-foreground font-medium text-sm">
								Can I cancel my subscription anytime?
							</h4>
							<p className="text-muted-foreground text-sm">
								Yes! You can cancel anytime from the Billing tab. Your Pro
								features will remain active until the end of your billing
								period.
							</p>
						</div>
					</div>
				</div>

				{/* Feedback Section */}
				<div className="bg-card border border-border rounded-lg p-6 space-y-4">
					<HeadingH3Bold className="text-foreground">
						Feedback & Feature Requests
					</HeadingH3Bold>
					<p className="text-muted-foreground text-sm">
						Have ideas for new features or improvements? We'd love to hear from
						you!
					</p>

					<Button
						className="w-full justify-start bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 border-purple-500/30"
						onClick={() => window.open("https://x.com/supermemoryai", "_blank")}
						variant="outline"
					>
						<MessageCircle className="w-4 h-4 mr-2" />
						Share your feedback on X
						<ExternalLink className="w-4 h-4 ml-auto" />
					</Button>
				</div>
			</div>
		</div>
	)
}