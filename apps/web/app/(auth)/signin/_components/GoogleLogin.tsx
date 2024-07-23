import { signIn } from "@/server/auth";
import { Google } from "@repo/ui/components/icons";

function GoogleLogin() {
	return (
		<form
			action={async () => {
				"use server";
				await signIn("google", {
					redirectTo: "/home",
				});
			}}
		>
			<button
				type="submit"
				className={`relative text-white transition-width flex gap-3 justify-center w-full items-center rounded-2xl bg-page-gradient hover:opacity-70  duration-500  px-6 py-4 outline-none duration- focus:outline-none `}
			>
				<Google className="w-4 h-4" />
				<span className="relative w-full">Continue with Google</span>
			</button>
		</form>
	)
}

export default GoogleLogin;