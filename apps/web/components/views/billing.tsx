import { useAuth } from "@lib/auth-context"
import {
	fetchConnectionsFeature,
	fetchMemoriesFeature,
	fetchSubscriptionStatus,
} from "@lib/queries"
import { Button } from "@ui/components/button"
import { HeadingH3Bold } from "@ui/text/heading/heading-h3-bold"
import { useCustomer } from "autumn-js/react"
import { CheckCircle, LoaderIcon, X } from "lucide-react"
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

	const { data: memoriesCheck } = fetchMemoriesFeature(autumn as any)

	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	const { data: connectionsCheck } = fetchConnectionsFeature(autumn as any)

	const connectionsUsed = connectionsCheck?.usage ?? 0

	// Fetch subscription status with React Query
	const {
		data: status = {
			consumer_pro: null,
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn as any)

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

	const isPro = status.consumer_pro

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

	if (isPro) {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="space-y-6"
				initial={{ opacity: 0, y: 10 }}
			>
				<div className="space-y-3">
					<HeadingH3Bold className="text-foreground flex items-center gap-2">
						Pro Plan
						<span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
							Active
						</span>
					</HeadingH3Bold>
					<p className="text-sm text-muted-foreground">
						You're enjoying expanded memory capacity with supermemory Pro!
					</p>
				</div>

				{/* Current Usage */}
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-foreground">Current Usage</h4>
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Memories</span>
							<span className="text-sm text-foreground">
								{memoriesUsed} / {memoriesLimit}
							</span>
						</div>
						<div className="w-full bg-muted rounded-full h-2">
							<div
								className="bg-green-500 h-2 rounded-full transition-all"
								style={{
									width: `${Math.min((memoriesUsed / memoriesLimit) * 100, 100)}%`,
								}}
							/>
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

				<Button onClick={handleManageBilling} size="sm" variant="default">
					Manage Billing
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
					<div className="w-full bg-muted rounded-full h-2">
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
							<li className="flex items-center gap-2 text-sm text-foreground">
								<CheckCircle className="h-4 w-4 text-green-500" />
								5000 memories
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

				<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
					<Button
						className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 w-full"
						disabled={isLoading || isCheckingStatus}
						onClick={handleUpgrade}
						size="sm"
					>
						{isLoading || isCheckingStatus ? (
							<>
								<LoaderIcon className="h-4 w-4 animate-spin mr-2" />
								Upgrading...
							</>
						) : (
							<div>Upgrade to Pro - $15/month (only for first 100 users)</div>
						)}
					</Button>
				</motion.div>

				<p className="text-xs text-muted-foreground text-center">
					Cancel anytime. No questions asked.
				</p>
			</div>
		</motion.div>
	)
}
