import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

export async function loader({ context }: LoaderFunctionArgs) {
	return redirect(
		"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc?hl=en",
	);
}
