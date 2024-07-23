import { signIn } from "@/server/auth";
import { Github } from "@repo/ui/components/icons";

function GitHubLogin() {
	return (
		<form
			action={async () => {
				"use server";
				await signIn("github", {
					redirectTo: "/home",
				});
			}}
		>
			<button
				type="submit"
				className={`relative text-white transition-width flex gap-3 justify-center w-full items-center rounded-2xl bg-page-gradient hover:opacity-70  duration-500  px-6 py-4 outline-none duration- focus:outline-none `}
			>
				<Github className="w-4 h-4" />
				<span className="relative w-full">Continue with GitHub</span>
			</button>
		</form>
	)
}

export default GitHubLogin;