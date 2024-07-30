import { auth } from "@/server/auth";
import "./canvasStyles.css";
import { redirect } from "next/navigation";
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
		<div className="h-screen">
			<div>{children}</div>
			<Toaster />
		</div>
	);
}
