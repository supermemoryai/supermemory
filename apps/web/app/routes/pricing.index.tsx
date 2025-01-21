import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

import { authkitLoader } from "@supermemory/authkit-remix-cloudflare";
import { CheckIcon, Sparkles } from "lucide-react";
import Navbar from "~/components/Navbar";

export const loader = (args: LoaderFunctionArgs) => authkitLoader(args);

const tiers = [
	{
		name: "Free",
		id: "tier-free",
		href: "/signin",
		price: "$0",
		description: "Get started with the essentials and upgrade anytime.",
		features: [
			"1,000 memories",
			"3 spaces", 
			"Basic search",
			"Limited API access",
			"Mobile-friendly interface",
			"Community support",
		],
		featured: false,
	},
	{
		name: "Standard",
		id: "tier-standard",
		href: "/pay/stripe?tier=tier-standard",
		priceMonthly: "$12",
		priceYearly: "$100",
		description: "Perfect for power users who want to unlock their full potential.",
		features: [
			"10,000 memories",
			"100 spaces",
			"Images and videos",
			"Collaborate with teams",
			"Full API access",
			"Auto-assign space",
			"Early access to features",
			"Priority email support",
			"Canvas & Editor (Coming soon)",
			"Own your data & LLM (Coming soon)",
		],
		featured: true,
		badge: "Most Popular",
		savings: "Save $44/year",
	},
	{
		name: "Early Supporter",
		id: "tier-lifetime",
		href: "/pay/stripe?tier=tier-lifetime",
		price: "$200",
		description: "One-time payment. Access forever. No subscription needed.",
		features: [
			"Unlimited memories",
			"Unlimited spaces",
			"Everything in Standard",
			"Full API access",
			"VIP email & chat support with founder",
			"Canvas & Note Editor",
			"Weekly Review Newsletter",
			"Access forever - no subscription",
			"All future updates included",
		],
		featured: false,
		badge: "Best Value",
	},
];

function classNames(...classes: (string | undefined | false)[]) {
	return classes.filter(Boolean).join(" ");
}

export default function Pay() {
	const { user } = useLoaderData<typeof loader>();

	return (
		<div className="min-h-screen font-geist">
			<Navbar user={user ?? undefined} />
			<div className="relative isolate px-4 py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
				<div
					className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl"
					aria-hidden="true"
				>
					<div
						className="mx-auto aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#0ea5e9] to-[#8b5cf6] dark:from-[#0369a1] dark:to-[#6d28d9] opacity-30"
						style={{
							clipPath:
								"polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
						}}
					/>
				</div>

				<div className="mx-auto max-w-4xl text-center">
					<h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.020em] text-neutral-900 dark:text-neutral-100">
						Supermemory Pricing
					</h1>
					<p className="mt-8 text-balance text-4xl sm:text-5xl font-semibold tracking-tight text-blue-500 dark:text-blue-400 sm:text-6xl">
						Your Intelligent Knowledge Platform for the AI Era
					</p>
				</div>

				<p className="mx-auto mt-6 max-w-2xl text-pretty text-center text-base sm:text-lg text-neutral-600 dark:text-neutral-400 sm:text-xl/8">
					Save bookmarks, notes, websites, tweets, and more in one place. Access your personal AI
					knowledge base anytime, anywhere.
				</p>

				<div className="mx-auto mt-12 sm:mt-16 grid max-w-lg grid-cols-1 items-stretch gap-y-10 sm:gap-y-0 lg:max-w-6xl lg:grid-cols-3">
					{tiers.map((tier, tierIdx) => (
						<div
							key={tier.id}
							className={classNames(
								tier.featured
									? "relative bg-neutral-900 dark:bg-blue-950 shadow-2xl rounded-3xl z-10 lg:scale-110"
									: "bg-white/60 dark:bg-white/5 sm:mx-8 lg:mx-0",
								"rounded-3xl",
								"p-6 sm:p-8 ring-1 ring-neutral-900/10 dark:ring-white/10 backdrop-blur-sm sm:p-10",
								"flex flex-col justify-between",
							)}
						>
							{tier.badge && (
								<div className="absolute -top-5 left-0 right-0 mx-auto w-fit px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded-full">
									{tier.badge}
								</div>
							)}
							<div>
								<div className="flex items-center gap-2">
									<h3
										id={tier.id}
										className={classNames(
											tier.featured ? "text-blue-400" : "text-blue-600 dark:text-blue-400",
											"text-base/7 font-semibold",
										)}
									>
										{tier.name}
									</h3>
									{tier.featured && <Sparkles className="h-4 w-4 text-blue-400" />}
								</div>
								<p className="mt-4 flex items-baseline gap-x-2">
									<span
										className={classNames(
											tier.featured ? "text-white" : "text-neutral-900 dark:text-white",
											"text-4xl sm:text-5xl font-semibold tracking-tight",
										)}
									>
										{tier.price || tier.priceMonthly}
									</span>
									{tier.priceMonthly && (
										<span
											className={classNames(
												tier.featured
													? "text-neutral-300"
													: "text-neutral-500 dark:text-neutral-400",
												"text-sm sm:text-base",
											)}
										>
											/month
										</span>
									)}
								</p>
								{tier.priceYearly && (
									<p
										className={classNames(
											tier.featured ? "text-neutral-300" : "text-neutral-500 dark:text-neutral-400",
											"mt-1 text-sm flex items-center gap-2",
										)}
									>
										or {tier.priceYearly}/year
										{tier.savings && (
											<span className="text-green-500 font-medium">({tier.savings})</span>
										)}
									</p>
								)}
								<p
									className={classNames(
										tier.featured ? "text-neutral-300" : "text-neutral-600 dark:text-neutral-300",
										"mt-6 text-sm sm:text-base/7",
									)}
								>
									{tier.description}
								</p>
								<ul
									role="list"
									className={classNames(
										tier.featured ? "text-neutral-300" : "text-neutral-600 dark:text-neutral-300",
										"mt-6 sm:mt-8 space-y-3 text-sm/6",
									)}
								>
									{tier.features.map((feature) => (
										<li key={feature} className="flex gap-x-3">
											<CheckIcon
												aria-hidden="true"
												className={classNames(
													tier.featured ? "text-blue-400" : "text-blue-600 dark:text-blue-400",
													"h-5 w-5 flex-none",
												)}
											/>
											{feature}
										</li>
									))}
								</ul>
							</div>
							{tier.id === "tier-standard" ? (
								<div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2">
									<a
										href={`${tier.href}-monthly`}
										aria-describedby={tier.id}
										className="flex-1 text-white ring-1 ring-inset ring-blue-500 hover:bg-blue-500/10 focus-visible:outline-blue-500 rounded-md px-3 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200"
									>
										Start Monthly Plan
									</a>
									<a
										href={`${tier.href}-yearly`}
										aria-describedby={tier.id}
										className="flex-1 bg-blue-500 text-white shadow-sm hover:bg-blue-400 focus-visible:outline-blue-500 rounded-md px-3 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200"
									>
										Save 37% Yearly
									</a>
								</div>
							) : (
								<a
									href={tier.href}
									aria-describedby={tier.id}
									className={classNames(
										tier.featured
											? "bg-blue-500 text-white shadow-sm hover:bg-blue-400 focus-visible:outline-blue-500"
											: "text-blue-600 dark:text-white ring-1 ring-inset ring-blue-200 dark:ring-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 focus-visible:outline-blue-600",
										"mt-6 sm:mt-8 block rounded-md px-3 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200",
									)}
								>
									{tier.price === "$0" ? "Try Supermemory Free" : "Get Lifetime Access"}
								</a>
							)}
						</div>
					))}
				</div>

				<p className="text-center mt-12 sm:mt-16 text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
					For enterprise plans and custom solutions, contact{" "}
					<a
						href="mailto:enterprises@supermemory.com"
						className="text-blue-500 hover:text-blue-400"
					>
						enterprises@supermemory.com
					</a>
				</p>
			</div>
			{/* TODO: MORE MARKETING HERE */}
		</div>
	);
}
