"use client"

import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { fetchConsumerProProduct } from "@lib/queries"
import { Button } from "@ui/components/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { useCustomer } from "autumn-js/react"
import { Clock, LoaderIcon, SkipForwardIcon, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function WaitlistPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const referralCode = searchParams.get('ref')
	const { user } = useAuth()
	const [isChecking, setIsChecking] = useState(true)
	const [isSkippingWaitlist, setIsSkippingWaitlist] = useState(false)
	const [waitlistStatus, setWaitlistStatus] = useState<{
		inWaitlist: boolean
		accessGranted: boolean
		createdAt: string
	} | null>(null)
	const autumn = useCustomer()

	// @ts-ignore
	const { data: earlyAccess } = fetchConsumerProProduct(autumn)

	const handleSkipWaitlist = async () => {
		setIsSkippingWaitlist(true)
		try {
			const res = await autumn.attach({
				productId: "consumer_pro",
				forceCheckout: true,
				successUrl: "https://app.supermemory.ai/",
			})
			if (res.data && "checkout_url" in res.data && res.data.checkout_url) {
				router.push(res.data.checkout_url)
			}
		} catch (error) {
			console.error("Error skipping waitlist:", error)
		} finally {
			setIsSkippingWaitlist(false)
		}
	}

	const handleLogout = async () => {
		try {
			await authClient.signOut()
			router.push("/")
		} catch (error) {
			console.error("Error signing out:", error)
			toast.error("Failed to sign out")
		}
	}

	useEffect(() => {
		async function checkAccess() {
			if (!user) {
				router.push("/")
				return
			}

			// Anonymous users should sign in first
			if (user.isAnonymous) {
				authClient.signOut()
				router.push("/")
				return
			}

			try {
				// Check waitlist status using the new endpoint
				const response = await $fetch("@get/waitlist/status")

				if (response.data) {
					setWaitlistStatus(response.data)

					if (!response.data.inWaitlist) {
						authClient.signOut()
						router.push("/login")
					}

					// If user has access, redirect to home
					if (response.data.accessGranted) {
						router.push("/")
					}
				}
			} catch (error) {
				console.error("Error checking waitlist status:", error)
				// If there's an error, assume user is on waitlist
				setWaitlistStatus({
					inWaitlist: true,
					accessGranted: false,
					createdAt: new Date().toISOString(),
				})
			} finally {
				setIsChecking(false)
			}
		}

		checkAccess()
	}, [user, router])

	if (isChecking) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p className="text-white/60">Checking access...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1419]">
			<Card className="max-w-md w-full bg-[#1a1f2a] border-white/10">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
						<Clock className="w-8 h-8 text-orange-500" />
					</div>
					<CardTitle className="text-2xl font-bold text-white">
						You're on the waitlist!
					</CardTitle>
					<CardDescription className="text-white/60 mt-2">
						{referralCode 
							? "Thanks for joining through a friend's invitation! You've been added to the waitlist with priority access."
							: "Thanks for your interest in supermemory. We'll notify you as soon as we're ready for you."
						}
					</CardDescription>
					{referralCode && (
						<div className="mt-3 px-3 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
							<p className="text-orange-400 text-sm font-medium">
								🎉 Referred by a friend! You'll get priority access.
							</p>
						</div>
					)}
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4">
						{!earlyAccess?.allowed && (
							<Button
								disabled={isSkippingWaitlist}
								onClick={handleSkipWaitlist}
							>
								{isSkippingWaitlist ? (
									<LoaderIcon className="w-4 h-4 animate-spin" />
								) : (
									<SkipForwardIcon className="w-4 h-4" />
								)}
								{isSkippingWaitlist
									? "Processing..."
									: "Skip the waitlist for $15"}
							</Button>
						)}
						<div className="pt-4 border-t border-white/10">
							<p className="text-white/60 text-sm">
								We're working hard to bring you the best experience. In the
								meantime, you can:
							</p>
							<ul className="mt-3 space-y-2 text-sm">
								<li className="flex items-center gap-2 text-white/80">
									<span className="text-orange-500">•</span>
									<a
										className="hover:text-white transition-colors underline"
										href="https://x.com/supermemoryai"
										rel="noopener noreferrer"
										target="_blank"
									>
										Follow our X for updates
									</a>
								</li>
								<li className="flex items-center gap-2 text-white/80">
									<span className="text-orange-500">•</span>
									<a
										className="hover:text-white transition-colors underline"
										href="https://supermemory.link/discord"
										rel="noopener noreferrer"
										target="_blank"
									>
										Join our community Discord
									</a>
								</li>
							</ul>
						</div>

						{user && (
							<div className="pt-4 text-center space-y-3">
								<p className="text-white/50 text-xs">
									Signed in as {user.email}
								</p>
								<Button 
									variant="outline" 
									size="sm"
									onClick={handleLogout}
									className="border-white/20 hover:bg-white/5"
								>
									<LogOut className="w-4 h-4 mr-2" />
									Sign out
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
