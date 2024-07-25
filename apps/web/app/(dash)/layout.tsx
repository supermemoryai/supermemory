import Header from "./header/header";
import Menu from "./menu";
import { redirect } from "next/navigation";
import { auth } from "../../server/auth";
import { Toaster } from "@repo/ui/shadcn/sonner";
import BackgroundPlus from "../(landing)/GridPatterns/PlusGrid";
import { getUser } from "../actions/fetchers";

async function Layout({ children }: { children: React.ReactNode }) {
	const info = await auth();

	if (!info) {
		return redirect("/signin");
	}

	const user = await getUser();
	const hasOnboarded = user.data?.hasOnboarded;

	if (!hasOnboarded) {
		redirect("/onboarding");
	}

	return (
		<main className="h-screen flex flex-col">
			<div className="fixed top-0 left-0 w-full z-40">
				<Header />
			</div>

			<div className="relative flex justify-center z-40 pointer-events-none">
				<div
					className="absolute -z-10 left-0 top-[10%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100 md:bg-opacity-70 blur-[337.4px]"
					style={{ transform: "rotate(-30deg)" }}
				/>
			</div>
			<BackgroundPlus className="absolute top-0 left-0 w-full h-full -z-50 opacity-70" />

			<Menu />

			<div className="w-full h-full">{children}</div>

			<Toaster />
		</main>
	);
}

export default Layout;
