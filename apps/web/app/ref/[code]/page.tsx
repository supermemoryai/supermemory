"use client"

import { $fetch } from "@repo/lib/api"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@ui/components/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { ShareIcon, LoaderIcon, ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { labelVariants } from "@ui/text/label"
import { cn } from "@lib/utils"
import { headingVariants } from "@ui/text/heading"
import { titleVariants } from "@ui/text/title"
import { useSession } from "@lib/auth"

export default function ReferralInvitePage() {
	const params = useParams()
	const code = params.code as string
	const router = useRouter()
	const session = useSession()

	const {
		data: referrerData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["referral", code],
		queryFn: async () => {
			if (!code) {
				throw new Error("Missing referral code")
			}

			const response = await $fetch("@get/referral/:code", {
				params: {
					code,
				},
			})

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to load referral information",
				)
			}

			return response.data
		},
		enabled: !!code,
		retry: 1,
	})

	if (session.data) {
		router.push("/")
	}

	const referrer = referrerData?.referrer

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p
						className={cn(
							labelVariants({ level: 1, weight: "regular", color: "muted" }),
						)}
					>
						Loading invitation...
					</p>
				</div>
			</div>
		)
	}

	if (error || !code) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
				<Card className="max-w-md w-full bg-sm-shark">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
							<ShareIcon className="w-8 h-8 text-red-500" />
						</div>
						<CardTitle
							className={cn(titleVariants({ level: 2, weight: "bold" }))}
						>
							Invalid Referral Link
						</CardTitle>
						<CardDescription
							className={cn(
								labelVariants({ level: 1, weight: "regular", color: "muted" }),
								"mt-2",
							)}
						>
							{error instanceof Error ? error.message : "Invalid referral code"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
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
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
			<Card className="max-w-md w-full bg-sm-shark">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4">
						<Avatar className="w-20 h-20">
							<AvatarImage src={referrer?.image || ""} alt={referrer?.name} />
							<AvatarFallback className="bg-orange-500/10 text-orange-500 text-2xl">
								{referrer?.name?.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					</div>
					<CardTitle
						className={cn(titleVariants({ level: 2, weight: "bold" }))}
					>
						You've been invited!
					</CardTitle>
					<CardDescription
						className={cn(
							labelVariants({ level: 1, weight: "regular", color: "muted" }),
							"mt-2",
						)}
					>
						<span className="text-orange-400 font-semibold">
							{referrer?.name}
						</span>{" "}
						invited you to join supermemory
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div
							className={
								(cn(
									headingVariants({
										level: "h2",
										weight: "medium",
									}),
								),
								"text-white text-center")
							}
						>
							You and {referrer?.name} both get a free month of{" "}
							<b>supermemory pro</b>
						</div>
						<div className="bg-sm-shark rounded-lg p-4 border border-white/10">
							<h3
								className={cn(headingVariants({ level: "h3", weight: "bold" }))}
							>
								What is supermemory?
							</h3>
							<p
								className={cn(
									labelVariants({
										level: 1,
										weight: "regular",
										color: "muted",
									}),
								)}
							>
								supermemory is an AI-powered personal knowledge base that helps
								you store, organize, and interact with all your digital
								memories.
							</p>
						</div>

						<Button
							className={cn(
								labelVariants({ level: 1, weight: "medium" }),
								"w-full",
							)}
							asChild
						>
							<Link href={`/login?ref=${code}`}>
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
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
