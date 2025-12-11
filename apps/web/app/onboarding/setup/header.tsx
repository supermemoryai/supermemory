import { motion } from "motion/react"
import { Logo } from "@ui/assets/Logo"
import { useAuth } from "@lib/auth-context"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"

export function SetupHeader() {
	const { user } = useAuth()
	const [name, setName] = useState<string>("")

	useEffect(() => {
		const storedName =
			localStorage.getItem("username") || localStorage.getItem("userName") || ""
		setName(storedName)
	}, [])

	const userName = name ? `${name.split(" ")[0]}'s` : "My"

	return (
		<motion.div
			className="flex p-6 justify-between items-center"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut" }}
		>
			<div className="flex items-center">
				<Logo className="h-7" />
				{name && (
					<div className="flex flex-col items-start justify-center ml-2">
						<p className="text-[#8B8B8B] text-xs leading-tight">
							{userName}
						</p>
						<p className="text-white font-bold text-xl leading-none -mt-1">
							supermemory
						</p>
					</div>
				)}
			</div>
			{user && (
				<Avatar className="border border-border h-8 w-8 md:h-10 md:w-10">
					<AvatarImage src={user?.image ?? ""} />
					<AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
				</Avatar>
			)}
		</motion.div>
	)
}
