"use client"

import { Button } from "@ui/components/button"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@repo/lib/utils"

export default function SettingsPageLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const router = useRouter()
	const pathname = usePathname()

	const navItems = [
		{ label: "Profile", path: "/settings" },
		{ label: "Integrations", path: "/settings/integrations" },
		{ label: "Billing", path: "/settings/billing" },
		{ label: "Support", path: "/settings/support" },
	]

	return (
		<div className="flex-1 overflow-hidden max-w-screen-lg mx-auto mt-4">
			<div className="flex flex-col items-center">
				<div className="w-full max-w-2xl">
					<nav className="flex gap-[2px] px-1 py-1 text-sm rounded-[8px] bg-muted-foreground/10 text-foreground max-w-fit">
						{navItems.map((item) => {
							const isActive = pathname === item.path
							return (
								<Button
									key={item.path}
									onClick={() => router.push(item.path)}
									variant="settingsNav"
									size="sm"
									className={cn(
										"transition-all duration-200",
										isActive
											? "opacity-100 bg-card"
											: "opacity-60 hover:opacity-100 hover:bg-card ",
									)}
								>
									{item.label}
								</Button>
							)
						})}
					</nav>
					{children}
				</div>
			</div>
		</div>
	)
}
