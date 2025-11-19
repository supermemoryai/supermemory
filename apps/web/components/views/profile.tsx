"use client"

import { useAuth } from "@lib/auth-context"
import {
	fetchConnectionsFeature,
	fetchMemoriesFeature,
	fetchSubscriptionStatus,
} from "@lib/queries"
import { Button } from "@repo/ui/components/button"
import { Skeleton } from "@repo/ui/components/skeleton"
import { HeadingH3Bold } from "@repo/ui/text/heading/heading-h3-bold"
import { useCustomer } from "autumn-js/react"
import {
	AlertTriangle,
	CheckCircle,
	CreditCard,
	LoaderIcon,
	User,
	X,
} from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useState } from "react"

export function ProfileView() {
	const { user: session, org } = useAuth()
	const organizations = org
	const autumn = useCustomer()
	const [isLoading, setIsLoading] = useState(false)

	const {
		data: status = {
			consumer_pro: { allowed: false, status: null },
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	const proStatus = status.consumer_pro
	const isPro = proStatus?.allowed ?? false
	const proProductStatus = proStatus?.status
	const isPastDue = proProductStatus === "past_due"
	const hasProProduct = proProductStatus !== null

	const { data: memoriesCheck } = fetchMemoriesFeature(
		autumn,
		!isCheckingStatus && !autumn.isLoading,
	)
	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	const { data: connectionsCheck } = fetchConnectionsFeature(
		autumn,
		!isCheckingStatus && !autumn.isLoading,
	)
	const connectionsUsed = connectionsCheck?.usage ?? 0

	const handleUpgrade = async () => {
		setIsLoading(true)
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			})
			window.location.reload()
		} catch (error) {
			console.error(error)
			setIsLoading(false)
		}
	}

	const handleManageBilling = async () => {
		await autumn.openBillingPortal({
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
					<p className="text-foreground/70 mb-4">
						Sign in to access your profile and billing
					</p>
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							asChild
							className="bg-muted hover:bg-muted/80 text-foreground border-border"
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
			<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-4">
				<div className="flex items-start gap-3 sm:gap-4">
					<div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
						{session?.image ? (
							<img
								src={session.image}
								alt={session?.name || session?.email || "User"}
								className="w-full h-full rounded-full object-cover"
							/>
						) : (
							<User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
						)}
					</div>
					<div className="flex-1 min-w-0">
						<div className="space-y-1">
							{session?.name && (
								<h3 className="text-foreground font-semibold text-base sm:text-lg truncate">
									{session.name}
								</h3>
							)}
							<p className="text-foreground font-medium text-sm truncate">
								{session?.email}
							</p>
						</div>
					</div>
				</div>

				{/* Additional Profile Details */}
				<div className="border-t border-border pt-3 space-y-2">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
						<div>
							<span className="text-muted-foreground block">Organization</span>
							<span className="text-foreground font-medium">
								{organizations?.name || "Personal"}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground block">Member since</span>
							<span className="text-foreground font-medium">
								{session?.createdAt
									? new Date(session.createdAt).toLocaleDateString("en-US", {
											month: "short",
											year: "numeric",
										})
									: "Recent"}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Billing Section */}
			{autumn.isLoading || isCheckingStatus ? (
				<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
					<div className="flex items-center gap-3 mb-3">
						<Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-3 w-12" />
						</div>
						<Skeleton className="h-2 w-full rounded-full" />
					</div>
					<div className="flex justify-between items-center">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-8" />
					</div>
					<div className="pt-2">
						<Skeleton className="h-8 w-full rounded" />
					</div>
				</div>
			) : (
				<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
					<div className="flex items-center gap-3 mb-3">
						<div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center">
							<CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
						</div>
						<div className="flex-1">
							<HeadingH3Bold className="text-foreground text-sm">
								{hasProProduct ? "Pro Plan" : "Free Plan"}
								{isPastDue ? (
									<span className="ml-2 text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
										Past Due
									</span>
								) : isPro ? (
									<span className="ml-2 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
										Active
									</span>
								) : null}
							</HeadingH3Bold>
							<p className="text-muted-foreground text-xs">
								{hasProProduct ? "Expanded memory capacity" : "Basic plan"}
							</p>
						</div>
					</div>

					{isPastDue && (
						<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
							<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm text-red-600 dark:text-red-400 font-medium">
									Payment Required
								</p>
								<p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
									Your payment is past due. Please update your payment method to
									restore access to Pro features.
								</p>
							</div>
						</div>
					)}

					{/* Usage Stats */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Memories</span>
							{hasProProduct ? (
								<span className="text-sm text-foreground">Unlimited</span>
							) : (
								<span
									className={`text-sm ${memoriesUsed >= memoriesLimit ? "text-red-500" : "text-foreground"}`}
								>
									{memoriesUsed} / {memoriesLimit}
								</span>
							)}
						</div>
						{!hasProProduct && (
							<div className="w-full bg-muted-foreground/50 rounded-full h-2">
								<div
									className={`h-2 rounded-full transition-all ${
										memoriesUsed >= memoriesLimit ? "bg-red-500" : "bg-blue-500"
									}`}
									style={{
										width: `${Math.min((memoriesUsed / memoriesLimit) * 100, 100)}%`,
									}}
								/>
							</div>
						)}
					</div>

					{hasProProduct && (
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Connections</span>
							<span className="text-sm text-foreground">
								{connectionsUsed} / 10
							</span>
						</div>
					)}

					{/* Billing Actions */}
					<div className="pt-2">
						{isPastDue ? (
							<Button
								className="w-full bg-red-600 hover:bg-red-700 text-white border-0"
								onClick={handleManageBilling}
								size="sm"
								variant="default"
							>
								Pay Past Due
							</Button>
						) : hasProProduct ? (
							<Button
								className="w-full"
								onClick={handleManageBilling}
								size="sm"
								variant="default"
							>
								Manage Billing
							</Button>
						) : (
							<Button
								className="w-full bg-[#267ffa] hover:bg-[#267ffa]/90 text-white border-0"
								disabled={isLoading || isCheckingStatus}
								onClick={handleUpgrade}
								size="lg"
							>
								{isLoading || isCheckingStatus ? (
									<>
										<LoaderIcon className="h-4 w-4 animate-spin mr-2" />
										<span className="hidden sm:inline">Upgrading...</span>
										<span className="sm:hidden">Loading...</span>
									</>
								) : (
									<>
										<span className="hidden sm:inline">
											Upgrade to Pro - $9/month
										</span>
										<span className="sm:hidden">Upgrade to Pro</span>
									</>
								)}
							</Button>
						)}
					</div>

					{!hasProProduct && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
								{/* Free Plan */}
								<div className="p-3 bg-muted/50 rounded-lg border border-border">
									<h4 className="font-medium text-foreground mb-3 text-sm">
										Free Plan
									</h4>
									<ul className="space-y-2">
										<li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
											<CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
											200 memories
										</li>
										<li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
											<X className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
											No connections
										</li>
										<li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
											<CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
											Basic search
										</li>
									</ul>
								</div>

								{/* Pro Plan */}
								<div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
									<h4 className="font-medium text-foreground mb-3 text-sm">
										<div className="flex items-center gap-2 flex-wrap">
											<span>Pro Plan</span>
											<span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
												Recommended
											</span>
										</div>
									</h4>
									<ul className="space-y-2">
										<li className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
											<CheckCircle className="h-4 w-4 text-green-400" />
											Unlimited memories
										</li>
										<li className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
											<CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
											10 connections
										</li>
										<li className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
											<CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
											Advanced search
										</li>
										<li className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
											<CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
											Priority support
										</li>
									</ul>
								</div>
							</div>

							<p className="text-xs text-muted-foreground text-center leading-relaxed">
								$9/month (only for first 100 users) • Cancel anytime. No
								questions asked.
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
