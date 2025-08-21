"use client";

import { useAuth } from "@lib/auth-context";
import { fetchMemoriesFeature, fetchSubscriptionStatus } from "@lib/queries";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs";
import { HeadingH3Bold } from "@repo/ui/text/heading/heading-h3-bold";
import { useCustomer } from "autumn-js/react";
import {
	CheckCircle,
	Copy,
	CreditCard,
	Gift,
	LoaderIcon,
	Share2,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

interface ReferralUpgradeModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function ReferralUpgradeModal({
	isOpen,
	onClose,
}: ReferralUpgradeModalProps) {
	const { user } = useAuth();
	const autumn = useCustomer();
	const [isLoading, setIsLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	const { data: memoriesCheck } = fetchMemoriesFeature(autumn as any);
	const memoriesUsed = memoriesCheck?.usage ?? 0;
	const memoriesLimit = memoriesCheck?.included_usage ?? 0;

	// Fetch subscription status
	const {
		data: status = {
			consumer_pro: null,
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn as any);

	const isPro = status.consumer_pro;

	// Handle upgrade
	const handleUpgrade = async () => {
		setIsLoading(true);
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			});
			window.location.reload();
		} catch (error) {
			console.error(error);
			setIsLoading(false);
		}
	};

	// Generate referral link (you'll need to implement this based on your referral system)
	const referralLink = `https://app.supermemory.ai/ref/${user?.id || "user"}`;

	const handleCopyReferralLink = async () => {
		try {
			await navigator.clipboard.writeText(referralLink);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy:", error);
		}
	};

	const handleShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: "Join Supermemory",
					text: "Check out Supermemory - the best way to organize and search your digital memories!",
					url: referralLink,
				});
			} catch (error) {
				console.error("Error sharing:", error);
			}
		} else {
			handleCopyReferralLink();
		}
	};

	if (user?.isAnonymous) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-md bg-[#0f1419] backdrop-blur-xl border-white/10 text-white">
					<motion.div
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						initial={{ opacity: 0, scale: 0.95 }}
					>
						<DialogHeader>
							<DialogTitle>Get More Memories</DialogTitle>
							<DialogDescription className="text-white/60">
								Sign in to access referrals and upgrade options
							</DialogDescription>
						</DialogHeader>

						<div className="text-center py-6">
							<Button
								asChild
								className="bg-white/10 hover:bg-white/20 text-white border-white/20"
							>
								<Link href="/login">Sign in</Link>
							</Button>
						</div>
					</motion.div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-lg bg-[#0f1419] backdrop-blur-xl border-white/10 text-white">
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					initial={{ opacity: 0, scale: 0.95 }}
				>
					<DialogHeader className="mb-4">
						<DialogTitle>Get More Memories</DialogTitle>
						<DialogDescription className="text-white/60">
							Expand your memory capacity through referrals or upgrades
						</DialogDescription>
					</DialogHeader>

					{/* Current Usage */}
					<div className="bg-white/5 rounded-lg p-4 mb-6">
						<div className="flex justify-between items-center mb-2">
							<span className="text-sm text-white/70">Current Usage</span>
							<span
								className={`text-sm ${memoriesUsed >= memoriesLimit ? "text-red-400" : "text-white/90"}`}
							>
								{memoriesUsed} / {memoriesLimit} memories
							</span>
						</div>
						<div className="w-full bg-white/10 rounded-full h-2">
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
					</div>

					{/* Tabs */}
					<Tabs defaultValue="refer" className="w-full">
						<TabsList className="grid w-full grid-cols-2 bg-white/5">
							<TabsTrigger value="refer" className="flex items-center gap-2">
								<Users className="w-4 h-4" />
								Refer Friends
							</TabsTrigger>
							{!isPro && (
								<TabsTrigger
									value="upgrade"
									className="flex items-center gap-2"
								>
									<CreditCard className="w-4 h-4" />
									Upgrade Plan
								</TabsTrigger>
							)}
						</TabsList>

						<TabsContent value="refer" className="space-y-4 mt-6">
							<div className="text-center">
								<Gift className="w-12 h-12 text-blue-400 mx-auto mb-3" />
								<HeadingH3Bold className="text-white mb-2">
									Invite Friends, Get More Memories
								</HeadingH3Bold>
								<p className="text-white/70 text-sm">
									For every friend who joins, you both get +5 extra memories!
								</p>
							</div>

							<div className="bg-white/5 rounded-lg p-4">
								<Label className="text-sm text-white/70 mb-2 block">
									Your Referral Link
								</Label>
								<div className="flex gap-2">
									<Input
										className="flex-1 bg-white/10 border-white/20 text-white"
										readOnly
										value={referralLink}
									/>
									<Button
										className="bg-white/5 hover:bg-white/10 text-white border-white/20"
										onClick={handleCopyReferralLink}
										size="sm"
										variant="outline"
									>
										{copied ? (
											<CheckCircle className="w-4 h-4" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
							</div>

							<Button
								className="w-full bg-white/5 hover:bg-white/10 text-white border-white/20"
								onClick={handleShare}
								variant="outline"
							>
								<Share2 className="w-4 h-4 mr-2" />
								Share Link
							</Button>
						</TabsContent>

						{!isPro && (
							<TabsContent value="upgrade" className="space-y-4 mt-6">
								<div className="text-center">
									<CreditCard className="w-12 h-12 text-purple-400 mx-auto mb-3" />
									<HeadingH3Bold className="text-white mb-2">
										Upgrade to Pro
									</HeadingH3Bold>
									<p className="text-white/70 text-sm">
										Get unlimited memories and advanced features
									</p>
								</div>

								<div className="bg-white/5 rounded-lg border border-white/10 p-4">
									<h4 className="font-medium text-white mb-3">
										Pro Plan Benefits
									</h4>
									<ul className="space-y-2">
										<li className="flex items-center gap-2 text-sm text-white/90">
											<CheckCircle className="h-4 w-4 text-green-400" />
											500 memories (vs {memoriesLimit} free)
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

								<Button
									className="w-full bg-blue-600 hover:bg-blue-700 text-white"
									disabled={isLoading || isCheckingStatus}
									onClick={handleUpgrade}
								>
									{isLoading || isCheckingStatus ? (
										<>
											<LoaderIcon className="h-4 w-4 animate-spin mr-2" />
											Upgrading...
										</>
									) : (
										"Upgrade to Pro - $15/month"
									)}
								</Button>

								<p className="text-xs text-white/50 text-center">
									Cancel anytime. No questions asked.
								</p>
							</TabsContent>
						)}
					</Tabs>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
