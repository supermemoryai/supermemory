"use client";

import { $fetch } from "@repo/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "./button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";
import { Input } from "./input";
import { CheckIcon, CopyIcon, ShareIcon, LoaderIcon } from "lucide-react";

interface ReferralLinkProps {
	className?: string;
}

export function ReferralLink({ className }: ReferralLinkProps) {
	const [copied, setCopied] = useState(false);

	const {
		data: referralData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["referral-code"],
		queryFn: async () => {
			const response = await $fetch("@get/referral/user/code");

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to fetch referral code",
				);
			}

			return response.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	const referralLink = referralData?.referralCode
		? `https://app.supermemory.ai/ref/${referralData.referralCode}`
		: "";

	const copyToClipboard = async () => {
		if (!referralLink) return;

		try {
			await navigator.clipboard.writeText(referralLink);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const shareReferralLink = async () => {
		if (!referralLink) return;

		if (navigator.share) {
			try {
				await navigator.share({
					title: "Join supermemory!",
					text: "I'm using supermemory to organize and interact with all my digital memories. Join me!",
					url: referralLink,
				});
			} catch (err) {
				// User cancelled or share failed
				console.log("Share cancelled or failed:", err);
			}
		} else {
			// Fallback to copy
			copyToClipboard();
		}
	};

	return (
		<Card className={`bg-[#1a1f2a] border-white/10 ${className}`}>
			<CardHeader>
				<CardTitle className="text-white flex items-center gap-2">
					<ShareIcon className="w-5 h-5 text-orange-500" />
					Invite Friends
				</CardTitle>
				<CardDescription className="text-white/60">
					Share your unique referral link with friends to invite them to
					supermemory
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading ? (
					<div className="flex items-center justify-center py-4">
						<LoaderIcon className="w-6 h-6 text-orange-500 animate-spin" />
					</div>
				) : error ? (
					<div className="text-red-400 text-sm">
						{error instanceof Error
							? error.message
							: "Failed to load referral code"}
					</div>
				) : (
					<>
						<div className="flex gap-2">
							<Input
								value={referralLink}
								readOnly
								className="bg-[#0f1419] border-white/10 text-white/80"
								onClick={(e) => e.currentTarget.select()}
							/>
							<Button
								variant="outline"
								size="icon"
								onClick={copyToClipboard}
								className="border-white/10 hover:bg-white/10"
							>
								{copied ? (
									<CheckIcon className="w-4 h-4 text-green-500" />
								) : (
									<CopyIcon className="w-4 h-4 text-white/60" />
								)}
							</Button>
						</div>

						<Button
							onClick={shareReferralLink}
							className="w-full bg-orange-500 hover:bg-orange-600 text-white"
						>
							<ShareIcon className="w-4 h-4 mr-2" />
							Share Referral Link
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
