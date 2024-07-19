import { redirect } from "next/navigation";

export async function GET() {
	return redirect(
		"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc?authuser=0&hl=en-GB",
	);
}
