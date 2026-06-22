"use client"

import { cn } from "@lib/utils"
import { Cog, House } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
	{ href: "/", label: "Home", icon: House },
	{ href: "/settings", label: "Settings", icon: Cog },
] as const

export function AppNav() {
	const pathname = usePathname()

	return (
		<nav className="flex w-48 shrink-0 flex-col gap-1 border-border/60 border-r p-3">
			{LINKS.map(({ href, label, icon: Icon }) => {
				const active = pathname === href
				return (
					<Link
						key={href}
						href={href}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
							active
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
					>
						<Icon className="size-4" />
						{label}
					</Link>
				)
			})}
		</nav>
	)
}
