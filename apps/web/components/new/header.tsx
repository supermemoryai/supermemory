"use client"

import { Logo } from "@ui/assets/Logo"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useAuth } from "@lib/auth-context"
import { useEffect, useState } from "react"
import {
	ChevronsLeftRight,
	LayoutGridIcon,
	Plus,
	SearchIcon,
	FolderIcon,
} from "lucide-react"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs"
import { useProjectName } from "@/hooks/use-project-name"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { useQuery } from "@tanstack/react-query"
import { $fetch } from "@repo/lib/api"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { useProject } from "@/stores"

interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
}

export function Header() {
	const { user } = useAuth()
	const [name, setName] = useState<string>("")
	const projectName = useProjectName()
	const { selectedProject } = useProject()
	const { switchProject } = useProjectMutations()

	const { data: projects = [] } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects")

			if (response.error) {
				throw new Error(response.error?.message || "Failed to load projects")
			}

			return response.data?.projects || []
		},
		staleTime: 30 * 1000,
	})

	useEffect(() => {
		const storedName =
			localStorage.getItem("username") || localStorage.getItem("userName") || ""
		setName(storedName)
	}, [])

	const userName = name ? `${name.split(" ")[0]}'s` : "My"
	return (
		<div className="flex p-4 justify-between items-center">
			<div className="flex items-center justify-center gap-4">
				<div className="flex items-center">
					<Logo className="h-7" />
					{name && (
						<div className="flex flex-col items-start justify-center ml-2">
							<p className="text-[#8B8B8B] text-sm leading-tight">{userName}</p>
							<p className="text-white font-bold text-xl leading-none -mt-1">
								supermemory
							</p>
						</div>
					)}
				</div>
				<div className="self-stretch w-px bg-[#FFFFFF33]" />
				<div className="flex items-center gap-2">
					<p>📁 {projectName}</p>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="cursor-pointer hover:opacity-70 transition-opacity"
								aria-label="Change project"
							>
								<ChevronsLeftRight className="size-4 rotate-90" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuItem
								onClick={() => switchProject(DEFAULT_PROJECT_ID)}
								className={cn(
									"cursor-pointer",
									selectedProject === DEFAULT_PROJECT_ID && "bg-accent",
								)}
							>
								<FolderIcon className="h-3.5 w-3.5 mr-2" />
								<span className="text-sm">Default Project</span>
							</DropdownMenuItem>
							{projects
								.filter((p: Project) => p.containerTag !== DEFAULT_PROJECT_ID)
								.map((project: Project) => (
									<DropdownMenuItem
										key={project.id}
										onClick={() => switchProject(project.containerTag)}
										className={cn(
											"cursor-pointer",
											selectedProject === project.containerTag && "bg-accent",
										)}
									>
										<FolderIcon className="h-3.5 w-3.5 mr-2 opacity-70" />
										<span className="text-sm truncate">{project.name}</span>
									</DropdownMenuItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<Tabs defaultValue="grid">
				<TabsList className="rounded-full border border-[#161F2C] h-11!">
					<TabsTrigger
						value="grid"
						className={cn(
							"rounded-full data-[state=active]:!bg-[#00173C] dark:data-[state=active]:!border-[#2261CA33] px-4 py-4",
							dmSansClassName(),
						)}
					>
						<LayoutGridIcon className="size-4" />
						Grid
					</TabsTrigger>
					<TabsTrigger
						value="graph"
						className={cn(
							"rounded-full dark:data-[state=active]:!bg-[#00173C] dark:data-[state=active]:!border-[#2261CA33] px-4 py-4",
							dmSansClassName(),
						)}
					>
						<LayoutGridIcon className="size-4" />
						Graph
					</TabsTrigger>
				</TabsList>
			</Tabs>
			<div className="flex items-center gap-2">
				<Button
					variant="headers"
					className="rounded-full text-base gap-2 !h-10"
				>
					<div className="flex items-center gap-2">
						<Plus className="size-4" />
						Add memory
					</div>
					<span
						className={cn(
							"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm size-4 text-[10px] flex items-center justify-center",
							dmSansClassName(),
						)}
					>
						C
					</span>
				</Button>
				<Button
					variant="headers"
					className="rounded-full text-base gap-2 !h-10"
				>
					<SearchIcon className="size-4" />
					<span className="bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm text-[10px] flex items-center justify-center gap-0.5 px-1">
						<svg
							className="size-[7.5px]"
							viewBox="0 0 9 9"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Search Icon</title>
							<path
								d="M6.66663 0.416626C6.33511 0.416626 6.01716 0.548322 5.78274 0.782743C5.54832 1.01716 5.41663 1.33511 5.41663 1.66663V6.66663C5.41663 6.99815 5.54832 7.31609 5.78274 7.55051C6.01716 7.78493 6.33511 7.91663 6.66663 7.91663C6.99815 7.91663 7.31609 7.78493 7.55051 7.55051C7.78493 7.31609 7.91663 6.99815 7.91663 6.66663C7.91663 6.33511 7.78493 6.01716 7.55051 5.78274C7.31609 5.54832 6.99815 5.41663 6.66663 5.41663H1.66663C1.33511 5.41663 1.01716 5.54832 0.782743 5.78274C0.548322 6.01716 0.416626 6.33511 0.416626 6.66663C0.416626 6.99815 0.548322 7.31609 0.782743 7.55051C1.01716 7.78493 1.33511 7.91663 1.66663 7.91663C1.99815 7.91663 2.31609 7.78493 2.55051 7.55051C2.78493 7.31609 2.91663 6.99815 2.91663 6.66663V1.66663C2.91663 1.33511 2.78493 1.01716 2.55051 0.782743C2.31609 0.548322 1.99815 0.416626 1.66663 0.416626C1.33511 0.416626 1.01716 0.548322 0.782743 0.782743C0.548322 1.01716 0.416626 1.33511 0.416626 1.66663C0.416626 1.99815 0.548322 2.31609 0.782743 2.55051C1.01716 2.78493 1.33511 2.91663 1.66663 2.91663H6.66663C6.99815 2.91663 7.31609 2.78493 7.55051 2.55051C7.78493 2.31609 7.91663 1.99815 7.91663 1.66663C7.91663 1.33511 7.78493 1.01716 7.55051 0.782743C7.31609 0.548322 6.99815 0.416626 6.66663 0.416626Z"
								stroke="#737373"
								strokeWidth="0.833333"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<span className={cn(dmSansClassName())}>K</span>
					</span>
				</Button>
				{user && (
					<Avatar className="border border-border h-8 w-8 md:h-10 md:w-10">
						<AvatarImage src={user?.image ?? ""} />
						<AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
					</Avatar>
				)}
			</div>
		</div>
	)
}
