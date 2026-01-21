"use client"
import { ProfileView } from "@/components/views/profile"
export default function ProfilePage() {
	return (
		<div className="py-6 max-w-xl">
			<h1 className="text-2xl font-bold text-foreground mb-2">
				Profile Settings
			</h1>
			<ProfileView />
		</div>
	)
}
