import Header from "./header/header";
import Menu from "./menu";
import { redirect } from "next/navigation";
import { auth } from "../../server/auth";
import { Toaster } from "@repo/ui/shadcn/sonner";

async function Layout({ children }: { children: React.ReactNode }) {
	const info = await auth();

	if (!info) {
		return redirect("/signin");
	}

	return (
		<main className="h-screen bg flex flex-col">
			<div className="fixed top-0 left-0 w-full z-40">
				<Header />
			</div>

				<div
					className="absolute z-[100] left-0 top-[10%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100 pointer-events-none md:bg-opacity-70 blur-[337.4px]"
					style={{ transform: "rotate(-30deg)" }}
				/>

			<Menu />

			<div className="w-full h-full">{children}</div>

			<Toaster />
		</main>
	);
}

export default Layout;
