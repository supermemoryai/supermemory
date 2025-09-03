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
import { ShareIcon, LoaderIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ReferralInvitePage() {
	const params = useParams()
	const code = params.code as string

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

	const referrer = referrerData?.referrer

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p className="text-white/60">Loading invitation...</p>
				</div>
			</div>
		)
	}

	if (error || !code) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
				<Card className="max-w-md w-full bg-[#1a1f2a] border-white/10">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
							<ShareIcon className="w-8 h-8 text-red-500" />
						</div>
						<CardTitle className="text-2xl font-bold text-white">
							Invalid Referral Link
						</CardTitle>
						<CardDescription className="text-white/60 mt-2">
							{error instanceof Error ? error.message : "Invalid referral code"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="text-center">
								<Link
									className="text-orange-500 hover:text-orange-400 text-sm underline"
									href="https://supermemory.ai"
								>
									Learn more about supermemory
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
			<Card className="max-w-md w-full bg-[#1a1f2a] border-white/10">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4">
						<Avatar className="w-20 h-20">
							<AvatarImage src={referrer?.image || ""} alt={referrer?.name} />
							<AvatarFallback className="bg-orange-500/10 text-orange-500 text-2xl">
								{referrer?.name?.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					</div>
					<CardTitle className="text-2xl font-bold text-white">
						You've been invited!
					</CardTitle>
					<CardDescription className="text-white/60 mt-2">
						<span className="text-orange-400 font-semibold">
							{referrer?.name}
						</span>{" "}
						invited you to join supermemory
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="bg-[#0f1419] rounded-lg p-4 border border-white/10">
							<h3 className="text-white font-semibold mb-2">
								What is supermemory?
							</h3>
							<p className="text-white/70 text-sm leading-relaxed">
								supermemory is an AI-powered personal knowledge base that helps
								you store, organize, and interact with all your digital
								memories.
							</p>
						</div>

						<Link href={`/login?ref=${code}`} className="block">
							<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
								Get Started
							</Button>
						</Link>

						<div className="text-center">
							<Link
								className="text-orange-500 hover:text-orange-400 text-sm underline"
								href="https://supermemory.ai"
							>
								Learn more about supermemory
							</Link>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
