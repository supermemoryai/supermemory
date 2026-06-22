"use client"

import { Logo } from "@ui/assets/Logo"
import { cn } from "@lib/utils"
import { ChevronRight, Cog, Home, LayoutGrid, SearchIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
	{ href: "/", label: "Home", icon: Home },
	{ href: "/settings", label: "Settings", icon: Cog },
] as const

export function AppNav() {
	const pathname = usePathname()
	const openSearch = () => {
		window.dispatchEvent(new Event("supermemory:open-search"))
	}

	return (
		<header className="relative z-10 flex shrink-0 items-center justify-between gap-1.5 p-2.5 md:gap-2 md:p-3">
			<div className="flex min-w-0 items-center gap-3">
				<Link
					href="/"
					className="relative flex shrink-0 items-center rounded-lg px-1.5 py-1 transition-colors hover:bg-white/[0.05]"
				>
					<Logo className="h-6 shrink-0" />
					<div className="ml-2 min-w-0">
						<div className="truncate text-[10px] leading-tight text-[#6B6B6B]">
							My
						</div>
						<div className="-mt-0.5 truncate font-medium text-lg text-white/90 leading-none">
							supermemory
						</div>
					</div>
				</Link>
				<ChevronRight className="hidden size-4 shrink-0 text-[#3F4853] md:block" />

				<div className="hidden items-center gap-1 rounded-full border border-[#161F2C] bg-[#0D121A]/80 p-1 md:flex">
					{LINKS.map(({ href, label, icon: Icon }) => {
						const active = pathname === href
						return (
							<Link
								key={href}
								href={href}
								className={cn(
									"inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent px-3 font-medium text-sm transition-colors",
									active
										? "border-[#2261CA33] bg-[#00173C] text-white"
										: "text-[#D0DAE7] hover:bg-white/[0.05] hover:text-white",
								)}
							>
								<Icon className="size-4" />
								{label}
							</Link>
						)
					})}
					<button
						type="button"
						className="inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent px-3 font-medium text-[#D0DAE7] text-sm transition-colors hover:bg-white/[0.05] hover:text-white"
					>
						<LayoutGrid className="size-4" />
						Memories
					</button>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1.5">
				<button
					type="button"
					onClick={openSearch}
					className="flex size-9 items-center justify-center rounded-full border border-[#161F2C] bg-[#0D121A]/80 text-[#D0DAE7] transition-colors hover:bg-white/[0.05] hover:text-white"
					aria-label="Search"
				>
					<SearchIcon className="size-4" />
				</button>
			</div>
		</header>
	)
}
