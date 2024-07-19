import React from "react";
import { Toaster } from "@repo/ui/shadcn/sonner";

function layout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			{children} <Toaster />
		</div>
	);
}

export default layout;
