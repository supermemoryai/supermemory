"use client"
import { BillingView } from "@/components/views/billing"
export default function BillingPage() {
	return (
		<div className="py-6 max-w-2xl">
			<h1 className="text-2xl font-bold text-foreground mb-6">
				Billing & Subscription
			</h1>
			<BillingView />
		</div>
	)
}
