import { signOut } from "@/server/auth";
import { Button } from "@repo/ui/shadcn/button";

export default function SignOutButton() {
	return (
		<form
			action={async () => {
				"use server";
				await signOut();
			}}
		>
			<Button
				variant="ghost"
				size="sm"
				type="submit"
				className="text-[#7D8994]"
			>
				Sign Out
			</Button>
		</form>
	);
}
