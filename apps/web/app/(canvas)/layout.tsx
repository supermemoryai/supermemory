import { auth } from "@/server/auth";
import "./canvasStyles.css";
import { redirect } from "next/navigation";
import BackgroundPlus from "../(landing)/GridPatterns/PlusGrid";
import { Toaster } from "@repo/ui/shadcn/sonner";

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const info = await auth();

	if (!info) {
		return redirect("/signin");
	}
	return (
		<>
			<div className="relative flex justify-center z-40 pointer-events-none">
				<div
					className="absolute -z-10 left-0 top-[10%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100 md:bg-opacity-70 blur-[337.4px]"
					style={{ transform: "rotate(-30deg)" }}
				/>
			</div>
			<BackgroundPlus className="absolute top-0 left-0 w-full h-full -z-50 opacity-70" />
			<div>{children}</div>
			<Toaster />
		</>
	);
}
