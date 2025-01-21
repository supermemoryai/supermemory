import { type ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";

import { isTheme } from "~/lib/theme-provider";
import { getThemeSession } from "~/lib/theme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
	const themeSession = await getThemeSession(request);
	const requestText = await request.text();
	const form = new URLSearchParams(requestText);
	const theme = form.get("theme");

	if (!isTheme(theme)) {
		return json({
			success: false,
			message: `theme value of ${theme} is not a valid theme`,
		});
	}

	themeSession.setTheme(theme);
	return json({ success: true }, { headers: { "Set-Cookie": await themeSession.commit() } });
};

export const loader = () => redirect("/", { status: 404 });
