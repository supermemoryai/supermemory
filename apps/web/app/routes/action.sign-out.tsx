import { ActionFunctionArgs, redirect } from "@remix-run/cloudflare";

import { signOut } from "@supermemory/authkit-remix-cloudflare";

export async function action({ request, context }: ActionFunctionArgs) {
	console.log("signing out");
	return await signOut(request, context);;
}

export const loader = () => redirect("/", { status: 404 });
