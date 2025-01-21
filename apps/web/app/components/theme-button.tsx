import { Theme, useTheme } from "~/lib/theme-provider";

function ThemeButton() {
	const [theme, setTheme] = useTheme();
	return (
		<button
			onClick={() => setTheme(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT)}
			className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/80"
		>
			{theme === Theme.LIGHT ? "Dark" : "Light"} Mode
		</button>
	);
}

export default ThemeButton;
