"use client"

import { Button } from "@ui/components/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { ArrowRightIcon, HeartIcon, ShareIcon } from "lucide-react"
import Link from "next/link"
import { labelVariants } from "@ui/text/label"
import { cn } from "@lib/utils"
import { headingVariants } from "@ui/text/heading"
import { titleVariants } from "@ui/text/title"

export default function ReferralHomePage() {
	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
			<Card className="max-w-md w-full bg-sm-shark">
				<CardHeader className="flex flex-col items-center gap-4">
					<div className="mx-auto size-16 rounded-full bg-black/40 flex items-center justify-center">
						<HeartIcon className="h-full" />
					</div>
					<div className="flex flex-col items-center gap-1">
						<CardTitle
							className={cn(titleVariants({ level: 3, weight: "bold" }))}
						>
							Missing Referral Code?
						</CardTitle>
						<CardDescription
							className={cn(
								labelVariants({
									level: 1,
									weight: "regular",
									color: "muted",
								}),
								"text-center",
							)}
						>
							It looks like you're missing a referral code. Get one from a
							friend or join directly!
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="bg-sm-shark rounded-lg p-4 border border-white/10">
						<h3
							className={cn(headingVariants({ level: "h3", weight: "bold" }))}
						>
							What is supermemory?
						</h3>
						<p
							className={cn(
								labelVariants({ level: 1, weight: "regular", color: "muted" }),
							)}
						>
							supermemory is an AI-powered personal knowledge base that helps
							you store, organize, and interact with all your digital memories.
						</p>
					</div>

					<Button
						className={cn(
							labelVariants({ level: 1, weight: "medium" }),
							"w-full",
						)}
						asChild
					>
						<Link href={"/login"}>
							Get Started <ArrowRightIcon className="w-4 h-4" />
						</Link>
					</Button>

					<div className="text-center">
						<Link
							className={cn(
								labelVariants({
									level: 1,
									weight: "regular",
									color: "default",
								}),
								"underline underline-offset-2 hover:opacity-50 transition-all",
							)}
							href="https://supermemory.ai"
						>
							Learn more
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
