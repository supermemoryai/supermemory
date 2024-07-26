import React from "react";
import { Toaster } from "@repo/ui/shadcn/sonner";

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			{children} <Toaster />
		</div>
	);
}

export default Layout;
