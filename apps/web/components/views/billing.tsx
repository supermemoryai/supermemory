import { useAuth } from "@lib/auth-context"
import {
	fetchConnectionsFeature,
	fetchMemoriesFeature,
	fetchSubscriptionStatus,
} from "@lib/queries"
import { Button } from "@ui/components/button"
import { HeadingH3Bold } from "@ui/text/heading/heading-h3-bold"
import { useCustomer } from "autumn-js/react"
import { AlertTriangle, CheckCircle, LoaderIcon, X } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { analytics } from "@/lib/analytics"

export function BillingView() {
	const autumn = useCustomer()
	const { user } = useAuth()
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		analytics.billingViewed()
	}, [])

	const {
		data: status = {
			consumer_pro: { allowed: false, status: null },
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	const proStatus = status.consumer_pro
	const proProductStatus = proStatus?.status
	const isPastDue = proProductStatus === "past_due"
	const hasProProduct = proProductStatus !== null

	const { data: memoriesCheck } = fetchMemoriesFeature(
		autumn,
		!autumn.isLoading && !isCheckingStatus,
	)

	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	const { data: connectionsCheck } = fetchConnectionsFeature(
		autumn,
		!autumn.isLoading && !isCheckingStatus,
	)

	const connectionsUsed = connectionsCheck?.usage ?? 0

	// Handle upgrade
	const handleUpgrade = async () => {
		analytics.upgradeInitiated()
		setIsLoading(true)
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			})
			analytics.upgradeCompleted()
			window.location.reload()
		} catch (error) {
			console.error(error)
			setIsLoading(false)
		}
	}

	// Handle manage billing
	const handleManageBilling = async () => {
		analytics.billingPortalOpened()
		await autumn.openBillingPortal({
			returnUrl: "https://app.supermemory.ai",
		})
	}

	if (user?.isAnonymous) {
		return (
			<motion.div
				animate={{ opacity: 1, scale: 1 }}
				className="text-center py-8"
				initial={{ opacity: 0, scale: 0.9 }}
				transition={{ type: "spring", damping: 20 }}
			>
				<p className="text-muted-foreground mb-4">
					Sign in to unlock premium features
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
		)
	}

	if (hasProProduct) {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="space-y-6"
				initial={{ opacity: 0, y: 10 }}
			>
				<div className="space-y-3">
					<HeadingH3Bold className="text-foreground flex items-center gap-2">
						Pro Plan
						{isPastDue ? (
							<span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
								Past Due
							</span>
						) : (
							<span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
								Active
							</span>
						)}
					</HeadingH3Bold>
					<p className="text-sm text-muted-foreground">
						{isPastDue
							? "Your payment is past due. Please update your payment method to restore access."
							: "You're enjoying expanded memory capacity with supermemory Pro!"}
					</p>
				</div>

				{isPastDue && (
					<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
						<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
								Payment Required
							</p>
							<p className="text-xs text-red-600/80 dark:text-red-400/80">
								Your payment method failed or payment is past due. Update your
								payment information to restore access to all Pro features.
							</p>
						</div>
					</div>
				)}

				{/* Current Usage */}
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-foreground">Current Usage</h4>
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Memories</span>
							<span className="text-sm text-foreground">Unlimited</span>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Connections</span>
							<span className="text-sm text-foreground">
								{connectionsUsed} / 10
							</span>
						</div>
					</div>
				</div>

				<Button
					onClick={handleManageBilling}
					size="sm"
					variant="default"
					className={isPastDue ? "bg-red-600 hover:bg-red-700 text-white" : ""}
				>
					{isPastDue ? "Pay Past Due" : "Manage Billing"}
				</Button>
			</motion.div>
		)
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="space-y-6"
			initial={{ opacity: 0, y: 10 }}
		>
			{/* Current Usage - Free Plan */}
			<div className="space-y-3">
				<HeadingH3Bold className="text-foreground">
					Current Plan: Free
				</HeadingH3Bold>
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<span className="text-sm text-muted-foreground">Memories</span>
						<span
							className={`text-sm ${memoriesUsed >= memoriesLimit ? "text-red-500" : "text-foreground"}`}
						>
							{memoriesUsed} / {memoriesLimit}
						</span>
					</div>
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
				</div>
			</div>

			{/* Comparison */}
			<div className="space-y-4">
				<HeadingH3Bold className="text-foreground">
					Upgrade to Pro
				</HeadingH3Bold>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Free Plan */}
					<div className="p-4 bg-muted/50 rounded-lg border border-border">
						<h4 className="font-medium text-foreground mb-3">Free Plan</h4>
						<ul className="space-y-2">
							<li className="flex items-center gap-2 text-sm text-muted-foreground">
								<CheckCircle className="h-4 w-4 text-green-500" />
								200 memories
							</li>
							<li className="flex items-center gap-2 text-sm text-muted-foreground">
								<X className="h-4 w-4 text-red-500" />
								No connections
							</li>
							<li className="flex items-center gap-2 text-sm text-muted-foreground">
								<CheckCircle className="h-4 w-4 text-green-500" />
								Basic search
							</li>
						</ul>
					</div>

					{/* Pro Plan */}
					<div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
						<h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
							Pro Plan
							<span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
								Recommended
							</span>
						</h4>
						<ul className="space-y-2">
							<li className="flex items-center gap-2 text-sm text-white/90">
								<CheckCircle className="h-4 w-4 text-green-400" />
								Unlimited memories
							</li>
							<li className="flex items-center gap-2 text-sm text-foreground">
								<CheckCircle className="h-4 w-4 text-green-500" />
								10 connections
							</li>
							<li className="flex items-center gap-2 text-sm text-foreground">
								<CheckCircle className="h-4 w-4 text-green-500" />
								Advanced search
							</li>
							<li className="flex items-center gap-2 text-sm text-foreground">
								<CheckCircle className="h-4 w-4 text-green-500" />
								Priority support
							</li>
						</ul>
					</div>
				</div>

				<Button
					className="bg-blue-600 hover:bg-blue-700 text-white border-0 w-full"
					disabled={isLoading || isCheckingStatus}
					onClick={handleUpgrade}
				>
					{isLoading || isCheckingStatus ? (
						<>
							<LoaderIcon className="h-4 w-4 animate-spin mr-2" />
							Upgrading...
						</>
					) : (
						<div>Upgrade to Pro - $9/month (only for first 100 users)</div>
					)}
				</Button>

				<p className="text-xs text-muted-foreground text-center">
					Cancel anytime. No questions asked.
				</p>
			</div>
		</motion.div>
	)
}
