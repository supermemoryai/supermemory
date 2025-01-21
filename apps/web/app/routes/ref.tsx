// import { getSignInUrl, signOut, authkitLoader } from '@supermemory/authkit-remix-cloudflare';
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData } from "@remix-run/react";

import { Theme, useTheme } from "~/lib/theme-provider";

export const loader = (args: LoaderFunctionArgs) => {
	return json({});
};

export default function HomePage() {
	const [theme, setTheme] = useTheme();

	return (
		<div className="min-h-screen">
			<Form method="post">
				{/* <p>Welcome back {user?.firstName && `, ${user?.firstName}`}</p> */}
				<button type="submit">Sign out</button>
			</Form>

			{/* <button onClick={() => setTheme(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT)}>{theme}</button> */}
		</div>
	);
}
