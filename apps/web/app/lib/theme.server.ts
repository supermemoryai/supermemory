import { createCookieSessionStorage } from "@remix-run/cloudflare";

import { Theme, isTheme } from "./theme-provider";

const themeStorage = createCookieSessionStorage({
	cookie: {
		name: "remix__theme",
		secure: true,
		secrets: ['theme-secret-sm'],
		sameSite: "lax",
		path: "/",
		httpOnly: true,
	},
});

async function getThemeSession(request: Request) {
	const session = await themeStorage.getSession(request.headers.get("Cookie"));
	return {
		getTheme: () => {
			const themeValue = session.get("theme");
			return isTheme(themeValue) ? themeValue : Theme.DARK;
		},
		setTheme: (theme: Theme) => session.set("theme", theme),
		commit: () => themeStorage.commitSession(session),
	};
}

export { getThemeSession };
