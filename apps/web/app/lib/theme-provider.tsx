import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { useFetcher } from "@remix-run/react";

enum Theme {
	DARK = "dark",
	LIGHT = "light",
}
const themes: Array<Theme> = Object.values(Theme);

type ThemeContextType = [Theme | null, Dispatch<SetStateAction<Theme | null>>];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const prefersLightMQ = "(prefers-color-scheme: light)";
const getPreferredTheme = () =>
	window.matchMedia(prefersLightMQ).matches ? Theme.LIGHT : Theme.DARK;

function ThemeProvider({
	children,
	specifiedTheme,
}: {
	children: ReactNode;
	specifiedTheme: Theme | null;
}) {
	const [theme, setTheme] = useState<Theme | null>(() => {
		if (specifiedTheme) {
			if (themes.includes(specifiedTheme)) {
				return specifiedTheme;
			} else {
				return null;
			}
		}

		if (typeof window !== "object") {
			return null;
		}

		return getPreferredTheme();
	});

	const persistTheme = useFetcher();

	const mountRun = useRef(false);

	useEffect(() => {
		if (!mountRun.current) {
			mountRun.current = true;
			return;
		}
		if (!theme) {
			return;
		}

		persistTheme.submit({ theme }, { action: "action/set-theme", method: "post" });
	}, [theme]);

	useEffect(() => {
		const mediaQuery = window.matchMedia(prefersLightMQ);
		const handleChange = () => {
			setTheme(mediaQuery.matches ? Theme.LIGHT : Theme.DARK);
		};
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const contextValue = useMemo<ThemeContextType>(() => [theme, setTheme], [theme, setTheme]);

	return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

const clientThemeCode = `
// hi there dear reader 👋
// this is how I make certain we avoid a flash of the wrong theme. If you select
// a theme, then I'll know what you want in the future and you'll not see this
// script anymore.
;(() => {
  const theme = window.matchMedia(${JSON.stringify(prefersLightMQ)}).matches
    ? 'light'
    : 'dark';

  const cl = document.documentElement.classList;

  const themeAlreadyApplied = cl.contains('light') || cl.contains('dark');
  if (themeAlreadyApplied) {
    // this script shouldn't exist if the theme is already applied!
    console.warn(
      "Hi there, could you let Matt know you're seeing this message? Thanks!",
    );
  } else {
    cl.add(theme);
  }

  const meta = document.querySelector('meta[name=color-scheme]');
  if (meta) {
    if (theme === 'dark') {
      meta.content = 'dark light';
    } else if (theme === 'light') {
      meta.content = 'light dark';
    }
  } else {
    console.warn(
      "Hey, could you let Matt know you're seeing this message? Thanks!",
    );
  }
})();
`;

function NonFlashOfWrongThemeEls({ ssrTheme }: { ssrTheme: boolean }) {
	const [theme] = useTheme();

	return (
		<>
			<meta name="color-scheme" content={theme === "light" ? "light dark" : "dark light"} />
			{ssrTheme ? null : <script dangerouslySetInnerHTML={{ __html: clientThemeCode }} />}
		</>
	);
}

function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}

function isTheme(value: unknown): value is Theme {
	return typeof value === "string" && themes.includes(value as Theme);
}

export { isTheme, NonFlashOfWrongThemeEls, Theme, ThemeProvider, useTheme };
