"use client"
import { IntegrationsView } from "@/components/views/integrations"
export default function IntegrationsPage() {
	return (
		<div className="py-6 max-w-4xl">
			<h1 className="text-2xl font-bold text-foreground mb-6">Integrations</h1>
			<IntegrationsView />
		</div>
	)
}
