"use client"

import { useAuth } from "@lib/auth-context"
import {
	fetchConnectionsFeature,
	fetchMemoriesFeature,
	fetchSubscriptionStatus,
	useUserProfile,
} from "@lib/queries"
import { Button } from "@repo/ui/components/button"
import { Skeleton } from "@repo/ui/components/skeleton"
import { HeadingH3Bold } from "@repo/ui/text/heading/heading-h3-bold"
import { useCustomer } from "autumn-js/react"
import {
	AlertCircle,
	Brain,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	CreditCard,
	LoaderIcon,
	User,
	X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useState } from "react"

export function ProfileView() {
	const { user: session, org } = useAuth()
	const organizations = org
	const autumn = useCustomer()
	const [isLoading, setIsLoading] = useState(false)
	const [showAllStatic, setShowAllStatic] = useState(false)
	const [showAllDynamic, setShowAllDynamic] = useState(false)

	const {
		data: status = {
			consumer_pro: null,
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	const isPro = status.consumer_pro

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

	const {
		data: profileData,
		isLoading: isLoadingProfile,
		error: profileError,
		refetch: refetchProfile,
	} = useUserProfile(session?.email ?? null, !session?.isAnonymous)

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
								{isPro ? "Pro Plan" : "Free Plan"}
								{isPro && (
									<span className="ml-2 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
										Active
									</span>
								)}
							</HeadingH3Bold>
							<p className="text-muted-foreground text-xs">
								{isPro ? "Expanded memory capacity" : "Basic plan"}
							</p>
						</div>
					</div>

					{/* Usage Stats */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Memories</span>
							{isPro ? (
								<span className="text-sm text-foreground">Unlimited</span>
							) : (
								<span
									className={`text-sm ${memoriesUsed >= memoriesLimit ? "text-red-500" : "text-foreground"}`}
								>
									{memoriesUsed} / {memoriesLimit}
								</span>
							)}
						</div>
						{!isPro && (
							<div className="w-full bg-muted-foreground/50 rounded-full h-2">
								<div
									className={`h-2 rounded-full transition-all ${
										memoriesUsed >= memoriesLimit
											? "bg-red-500"
											: isPro
												? "bg-green-500"
												: "bg-blue-500"
									}`}
									style={{
										width: `${Math.min((memoriesUsed / memoriesLimit) * 100, 100)}%`,
									}}
								/>
							</div>
						)}
					</div>

					{isPro && (
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Connections</span>
							<span className="text-sm text-foreground">
								{connectionsUsed} / 10
							</span>
						</div>
					)}

					{/* Billing Actions */}
					<div className="pt-2">
						{isPro ? (
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
											Upgrade to Pro - $15/month
										</span>
										<span className="sm:hidden">Upgrade to Pro</span>
									</>
								)}
							</Button>
						)}
					</div>

					{!isPro && (
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
								$15/month (only for first 100 users) • Cancel anytime. No
								questions asked.
							</p>
						</div>
					)}
				</div>
			)}

			{/* Profile Facts Section */}
			{isLoadingProfile ? (
				<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
					<div className="flex items-center gap-3 mb-3">
						<Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
					</div>
					<div className="space-y-3 pt-2 border-t border-border">
						{[...Array(3)].map((_, i) => (
							<div key={`skeleton-${i}`} className="space-y-2">
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-3 w-5/6" />
							</div>
						))}
					</div>
				</div>
			) : profileError ? (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className="bg-card border border-border rounded-lg p-3 sm:p-4"
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ type: "spring", damping: 20 }}
				>
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
							<AlertCircle className="w-6 h-6 text-red-500" />
						</div>
						<p className="text-foreground font-medium mb-1 text-sm">
							Failed to load profile
						</p>
						<p className="text-muted-foreground text-xs mb-4">
							{profileError.message || "Something went wrong"}
						</p>
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button
								className="bg-muted hover:bg-muted/80 text-foreground border-border"
								onClick={() => refetchProfile()}
								size="sm"
								variant="outline"
							>
								Try again
							</Button>
						</motion.div>
					</div>
				</motion.div>
			) : !profileData?.profile?.static && !profileData?.profile?.dynamic ? (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className="bg-card border border-border rounded-lg p-3 sm:p-4"
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ type: "spring", damping: 20 }}
				>
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center mb-4">
							<Brain className="w-8 h-8 text-blue-500" />
						</div>
						<p className="text-foreground font-medium mb-2 text-sm">
							Building your profile...
						</p>
						<p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
							As you interact with supermemory, we'll automatically learn about
							you and build a personalized profile to give you better results.
						</p>
					</div>
				</motion.div>
			) : (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="space-y-4"
					initial={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.3 }}
				>
					{/* Static Facts Section */}
					{profileData?.profile?.static &&
						profileData.profile.static.length > 0 && (
							<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
										<Brain className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
									</div>
									<div className="flex-1">
										<h3 className="text-foreground font-semibold text-sm sm:text-base">
											Who You Are
										</h3>
										<p className="text-muted-foreground text-xs">
											Long-term facts about you
										</p>
									</div>
								</div>

								<div className="border-t border-border pt-3">
									<AnimatePresence mode="wait">
										<motion.ul
											animate={{ opacity: 1 }}
											className="space-y-2"
											exit={{ opacity: 0 }}
											initial={{ opacity: 0 }}
											key={showAllStatic ? "expanded" : "collapsed"}
										>
											{(showAllStatic
												? profileData.profile.static
												: profileData.profile.static.slice(0, 5)
											)?.map((fact, index) => (
												<motion.li
													animate={{ opacity: 1, x: 0 }}
													className="text-foreground text-sm flex items-start gap-2"
													initial={{ opacity: 0, x: -10 }}
													key={`static-${index}`}
													transition={{ delay: index * 0.05 }}
												>
													<span className="text-blue-500 mt-1 flex-shrink-0">
														•
													</span>
													<span className="flex-1 leading-relaxed">{fact}</span>
												</motion.li>
											))}
										</motion.ul>
									</AnimatePresence>

									{profileData.profile.static.length > 5 && (
										<motion.div
											className="mt-3"
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
										>
											<Button
												className="w-full text-xs"
												onClick={() => setShowAllStatic(!showAllStatic)}
												size="sm"
												variant="ghost"
											>
												{showAllStatic ? (
													<>
														<ChevronUp className="w-3 h-3 mr-1" />
														Show less
													</>
												) : (
													<>
														<ChevronDown className="w-3 h-3 mr-1" />
														Show {profileData.profile.static.length - 5} more
													</>
												)}
											</Button>
										</motion.div>
									)}
								</div>
							</div>
						)}

					{/* Dynamic Facts Section */}
					{profileData?.profile?.dynamic &&
						profileData.profile.dynamic.length > 0 && (
							<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
										<Brain className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
									</div>
									<div className="flex-1">
										<h3 className="text-foreground font-semibold text-sm sm:text-base">
											What You're Working On
										</h3>
										<p className="text-muted-foreground text-xs">
											Recent activities and context
										</p>
									</div>
								</div>

								<div className="border-t border-border pt-3">
									<AnimatePresence mode="wait">
										<motion.ul
											animate={{ opacity: 1 }}
											className="space-y-2"
											exit={{ opacity: 0 }}
											initial={{ opacity: 0 }}
											key={showAllDynamic ? "expanded" : "collapsed"}
										>
											{(showAllDynamic
												? profileData.profile.dynamic
												: profileData.profile.dynamic.slice(0, 5)
											)?.map((fact, index) => (
												<motion.li
													animate={{ opacity: 1, x: 0 }}
													className="text-foreground text-sm flex items-start gap-2"
													initial={{ opacity: 0, x: -10 }}
													key={`dynamic-${index}`}
													transition={{ delay: index * 0.05 }}
												>
													<span className="text-purple-500 mt-1 flex-shrink-0">
														•
													</span>
													<span className="flex-1 leading-relaxed">{fact}</span>
												</motion.li>
											))}
										</motion.ul>
									</AnimatePresence>

									{profileData.profile.dynamic.length > 5 && (
										<motion.div
											className="mt-3"
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
										>
											<Button
												className="w-full text-xs"
												onClick={() => setShowAllDynamic(!showAllDynamic)}
												size="sm"
												variant="ghost"
											>
												{showAllDynamic ? (
													<>
														<ChevronUp className="w-3 h-3 mr-1" />
														Show less
													</>
												) : (
													<>
														<ChevronDown className="w-3 h-3 mr-1" />
														Show {profileData.profile.dynamic.length - 5} more
													</>
												)}
											</Button>
										</motion.div>
									)}
								</div>
							</div>
						)}
				</motion.div>
			)}
		</div>
	)
}
