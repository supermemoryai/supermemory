"use client";

import { Button } from "@repo/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="bg-muted hover:bg-muted/80 text-foreground rounded-full"
			>
				<Sun className="h-4 w-4" />
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className="bg-muted hover:bg-muted/80 text-foreground rounded-full"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
		>
			{theme === "dark" ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</Button>
	);
}