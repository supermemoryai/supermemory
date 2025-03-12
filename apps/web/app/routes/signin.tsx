import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { getSignInUrl } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";

export async function loader({ request, context }: LoaderFunctionArgs) {

	const signinUrl = await getSignInUrl(context);
	return redirect(signinUrl);
}
