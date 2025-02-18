import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { getSignInUrl } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";

export async function loader({ request, context }: LoaderFunctionArgs) {
	const session = await getSessionFromRequest(request, context);
	if (session) {
		return redirect("/");
	}
	const signinUrl = await getSignInUrl(context);
	return redirect(signinUrl);
}
