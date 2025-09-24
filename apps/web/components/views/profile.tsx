"use client"

import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { Button } from "@repo/ui/components/button"
import { HeadingH3Bold } from "@repo/ui/text/heading/heading-h3-bold"
import { useCustomer } from "autumn-js/react"
import {
	CheckCircle,
	CreditCard,
	LoaderIcon,
	LogOut,
	User,
	X,
} from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { analytics } from "@/lib/analytics"
import { $fetch } from "@lib/api"

export function ProfileView() {
	const router = useRouter()
	const { user: session } = useAuth()
	const {
		customer,
		isLoading: isCustomerLoading,
		openBillingPortal,
		attach,
	} = useCustomer()
	const [isLoading, setIsLoading] = useState(false)
	const [billingData, setBillingData] = useState<{
		isPro: boolean
		memoriesUsed: number
		memoriesLimit: number
		connectionsUsed: number
		connectionsLimit: number
	}>({
		isPro: false,
		memoriesUsed: 0,
		memoriesLimit: 0,
		connectionsUsed: 0,
		connectionsLimit: 0,
	})

	useEffect(() => {
		if (!isCustomerLoading) {
			const memoriesFeature = customer?.features?.memories ?? {
				usage: 0,
				included_usage: 0,
			}
			const connectionsFeature = customer?.features?.connections ?? {
				usage: 0,
				included_usage: 0,
			}

			setBillingData({
				isPro:
					customer?.products?.some(
						(product) => product.id === "consumer_pro",
					) ?? false,
				memoriesUsed: memoriesFeature?.usage ?? 0,
				memoriesLimit: memoriesFeature?.included_usage ?? 0,
				connectionsUsed: connectionsFeature?.usage ?? 0,
				connectionsLimit: connectionsFeature?.included_usage ?? 0,
			})
		}
	}, [isCustomerLoading, customer])

	const handleLogout = () => {
		analytics.userSignedOut()
		authClient.signOut()
		router.push("/login")
	}

	const handleUpgrade = async () => {
		setIsLoading(true)
		try {
			const upgradeResult = await attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			})
			if (
				upgradeResult.statusCode === 200 &&
				upgradeResult.data &&
				"code" in upgradeResult.data
			) {
				const isProPlanActivated =
					upgradeResult.data.code === "new_product_attached"
				if (isProPlanActivated && session?.name && session?.email) {
					try {
						await $fetch("@post/emails/welcome/pro", {
							body: {
								email: session?.email,
								firstName: session?.name,
							},
						})
					} catch (error) {
						console.error(error)
					}
				}
			}
		} catch (error) {
			console.error(error)
			setIsLoading(false)
		}
	}

	// Handle manage billing
	const handleManageBilling = async () => {
		await openBillingPortal({
			returnUrl: "https://app.supermemory.ai",
		})
	}

	if (session?.isAnonymous) {
		return (
			<div className="space-y-4">
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className="text-center py-8"
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ type: "spring", damping: 20 }}
				>
					<p className="text-white/70 mb-4">
						Sign in to access your profile and billing
					</p>
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							asChild
							className="bg-white/10 hover:bg-white/20 text-white border-white/20"
							size="sm"
						>
							<Link href="/login">Sign in</Link>
						</Button>
					</motion.div>
				</motion.div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Profile Section */}
			<div className="bg-white/5 rounded-lg p-4 space-y-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
						<User className="w-5 h-5 text-white/80" />
					</div>
					<div className="flex-1">
						<p className="text-white font-medium text-sm">{session?.email}</p>
						<p className="text-white/60 text-xs">Logged in</p>
					</div>
				</div>
			</div>

			{isCustomerLoading ? (
				<div className="bg-white/5 rounded-lg p-4 space-y-3 flex items-center justify-center">
					<LoaderIcon className="h-4 w-4 animate-spin mr-2" />
					Loading...
				</div>
			) : (
				<>
					{/* Billing Section */}
					<div className="bg-white/5 rounded-lg p-4 space-y-3">
						<div className="flex items-center gap-3 mb-3">
							<div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
								<CreditCard className="w-5 h-5 text-white/80" />
							</div>
							<div className="flex-1">
								<HeadingH3Bold className="text-white text-sm">
									{billingData.isPro ? "Pro Plan" : "Free Plan"}
									{billingData.isPro && (
										<span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
											Active
										</span>
									)}
								</HeadingH3Bold>
								<p className="text-white/60 text-xs">
									{billingData.isPro
										? "Expanded memory capacity"
										: "Basic plan"}
								</p>
							</div>
						</div>

						{/* Usage Stats */}
						<div className="space-y-2">
							<div className="flex justify-between items-center">
								<span className="text-sm text-white/70">Memories</span>
								<span
									className={`text-sm ${billingData.memoriesUsed >= billingData.memoriesLimit ? "text-red-400" : "text-white/90"}`}
								>
									{billingData.memoriesUsed} / {billingData.memoriesLimit}
								</span>
							</div>
							<div className="w-full bg-white/10 rounded-full h-2">
								<div
									className={`h-2 rounded-full transition-all ${
										billingData.memoriesUsed >= billingData.memoriesLimit
											? "bg-red-500"
											: billingData.isPro
												? "bg-green-500"
												: "bg-blue-500"
									}`}
									style={{
										width: `${Math.min((billingData.memoriesUsed / billingData.memoriesLimit) * 100, 100)}%`,
									}}
								/>
							</div>
						</div>

						{billingData.isPro && (
							<div className="flex justify-between items-center">
								<span className="text-sm text-white/70">Connections</span>
								<span className="text-sm text-white/90">
									{billingData.connectionsUsed} / 10
								</span>
							</div>
						)}

						{/* Billing Actions */}
						<div className="pt-2">
							{billingData.isPro ? (
								<motion.div
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Button
										className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
										onClick={handleManageBilling}
										size="sm"
										variant="outline"
									>
										Manage Billing
									</Button>
								</motion.div>
							) : (
								<motion.div
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Button
										className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
										disabled={isLoading || isCustomerLoading}
										onClick={handleUpgrade}
										size="sm"
									>
										{isLoading || isCustomerLoading ? (
											<>
												<LoaderIcon className="h-4 w-4 animate-spin mr-2" />
												Upgrading...
											</>
										) : (
											"Upgrade to Pro - $15/month"
										)}
									</Button>
								</motion.div>
							)}
						</div>
					</div>

					{/* Plan Comparison - Only show for free users */}
					{!billingData.isPro && (
						<div className="bg-white/5 rounded-lg p-4 space-y-4">
							<HeadingH3Bold className="text-white text-sm">
								Upgrade to Pro
							</HeadingH3Bold>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Free Plan */}
								<div className="p-3 bg-white/5 rounded-lg border border-white/10">
									<h4 className="font-medium text-white/90 mb-3 text-sm">
										Free Plan
									</h4>
									<ul className="space-y-2">
										<li className="flex items-center gap-2 text-sm text-white/70">
											<CheckCircle className="h-4 w-4 text-green-400" />
											200 memories
										</li>
										<li className="flex items-center gap-2 text-sm text-white/70">
											<X className="h-4 w-4 text-red-400" />
											No connections
										</li>
										<li className="flex items-center gap-2 text-sm text-white/70">
											<CheckCircle className="h-4 w-4 text-green-400" />
											Basic search
										</li>
									</ul>
								</div>

								{/* Pro Plan */}
								<div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
									<h4 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
										Pro Plan
										<span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
											Recommended
										</span>
									</h4>
									<ul className="space-y-2">
										<li className="flex items-center gap-2 text-sm text-white/90">
											<CheckCircle className="h-4 w-4 text-green-400" />
											Unlimited memories
										</li>
										<li className="flex items-center gap-2 text-sm text-white/90">
											<CheckCircle className="h-4 w-4 text-green-400" />
											10 connections
										</li>
										<li className="flex items-center gap-2 text-sm text-white/90">
											<CheckCircle className="h-4 w-4 text-green-400" />
											Advanced search
										</li>
										<li className="flex items-center gap-2 text-sm text-white/90">
											<CheckCircle className="h-4 w-4 text-green-400" />
											Priority support
										</li>
									</ul>
								</div>
							</div>

							<p className="text-xs text-white/50 text-center">
								$15/month (only for first 100 users) • Cancel anytime. No
								questions asked.
							</p>
						</div>
					)}
				</>
			)}

			<Button
				className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/30"
				onClick={handleLogout}
				variant="destructive"
			>
				<LogOut className="w-4 h-4 mr-2" />
				Sign Out
			</Button>
		</div>
	)
}
