import { motion } from "motion/react"
import { Logo } from "@ui/assets/Logo"
import { useAuth } from "@lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"

export function SetupHeader() {
	const { user } = useAuth()

	const displayName =
		user?.displayUsername ||
		localStorage.getItem("username") ||
		localStorage.getItem("userName") ||
		""
	const userName = displayName ? `${displayName.split(" ")[0]}'s` : "My"

	return (
		<motion.div
			className="flex p-6 justify-between items-center"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut" }}
		>
			<div className="flex items-center z-10!">
				<Logo className="h-7" />
				{displayName && (
					<div className="flex flex-col items-start justify-center ml-2">
						<p className="text-[#8B8B8B] text-[11px] leading-tight">
							{userName}
						</p>
						<p className="text-white font-bold text-xl leading-none -mt-1">
							supermemory
						</p>
					</div>
				)}
			</div>
			{user && (
				<Avatar className="border border-border h-8 w-8 md:h-10 md:w-10 z-10!">
					<AvatarImage src={user?.image ?? ""} />
					<AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
				</Avatar>
			)}
		</motion.div>
	)
}
