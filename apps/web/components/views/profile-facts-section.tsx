"use client"

import { Button } from "@repo/ui/components/button"
import { Skeleton } from "@repo/ui/components/skeleton"
import { AlertCircle, Brain, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { memo, useState } from "react"

interface ProfileFactsSectionProps {
	static?: string[]
	dynamic?: string[]
	isLoading: boolean
	error: Error | null
	onRetry?: () => void
}

export const ProfileFactsSection = memo(function ProfileFactsSection({
	static: staticFacts,
	dynamic: dynamicFacts,
	isLoading,
	error,
	onRetry,
}: ProfileFactsSectionProps) {
	const [showAllStatic, setShowAllStatic] = useState(false)
	const [showAllDynamic, setShowAllDynamic] = useState(false)

	const hasStaticFacts = staticFacts && staticFacts.length > 0
	const hasDynamicFacts = dynamicFacts && dynamicFacts.length > 0
	const hasAnyFacts = hasStaticFacts || hasDynamicFacts

	const visibleStaticFacts = showAllStatic
		? staticFacts
		: staticFacts?.slice(0, 5)
	const visibleDynamicFacts = showAllDynamic
		? dynamicFacts
		: dynamicFacts?.slice(0, 5)

	const needsStaticShowMore = (staticFacts?.length ?? 0) > 5
	const needsDynamicShowMore = (dynamicFacts?.length ?? 0) > 5

	if (isLoading) {
		return (
			<div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-4">
				<div className="flex items-center gap-3">
					<Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-48" />
					</div>
				</div>
				<div className="space-y-3 pt-2">
					{[...Array(3)].map((_, i) => (
						<div key={`skeleton-${i}`} className="space-y-2">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-5/6" />
						</div>
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
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
					<p className="text-foreground font-medium mb-1">
						Failed to load profile
					</p>
					<p className="text-muted-foreground text-xs mb-4">
						{error.message || "Something went wrong"}
					</p>
					{onRetry && (
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button
								className="bg-muted hover:bg-muted/80 text-foreground border-border"
								onClick={onRetry}
								size="sm"
								variant="outline"
							>
								Try again
							</Button>
						</motion.div>
					)}
				</div>
			</motion.div>
		)
	}

	if (!hasAnyFacts) {
		return (
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
					<p className="text-foreground font-medium mb-2">
						Building your profile...
					</p>
					<p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
						As you interact with supermemory, we'll automatically learn about
						you and build a personalized profile to give you better results.
					</p>
				</div>
			</motion.div>
		)
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="space-y-4"
			initial={{ opacity: 0, y: 10 }}
			transition={{ duration: 0.3 }}
		>
			{/* Static Facts Section */}
			{hasStaticFacts && (
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
								{visibleStaticFacts?.map((fact, index) => (
									<motion.li
										animate={{ opacity: 1, x: 0 }}
										className="text-foreground text-sm flex items-start gap-2"
										initial={{ opacity: 0, x: -10 }}
										key={`static-${index}`}
										transition={{ delay: index * 0.05 }}
									>
										<span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
										<span className="flex-1">{fact}</span>
									</motion.li>
								))}
							</motion.ul>
						</AnimatePresence>

						{needsStaticShowMore && (
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
											Show {(staticFacts?.length ?? 0) - 5} more
										</>
									)}
								</Button>
							</motion.div>
						)}
					</div>
				</div>
			)}

			{/* Dynamic Facts Section */}
			{hasDynamicFacts && (
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
								{visibleDynamicFacts?.map((fact, index) => (
									<motion.li
										animate={{ opacity: 1, x: 0 }}
										className="text-foreground text-sm flex items-start gap-2"
										initial={{ opacity: 0, x: -10 }}
										key={`dynamic-${index}`}
										transition={{ delay: index * 0.05 }}
									>
										<span className="text-purple-500 mt-1.5 flex-shrink-0">
											•
										</span>
										<span className="flex-1">{fact}</span>
									</motion.li>
								))}
							</motion.ul>
						</AnimatePresence>

						{needsDynamicShowMore && (
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
											Show {(dynamicFacts?.length ?? 0) - 5} more
										</>
									)}
								</Button>
							</motion.div>
						)}
					</div>
				</div>
			)}
		</motion.div>
	)
})
