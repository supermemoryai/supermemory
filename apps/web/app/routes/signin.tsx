import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

import { getSignInUrl } from "@supermemory/authkit-remix-cloudflare";

export async function loader({ context }: LoaderFunctionArgs) {
	const signinUrl = await getSignInUrl(context);
	return redirect(signinUrl);
}
