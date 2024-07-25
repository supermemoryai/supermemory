import { redirect } from "next/navigation";

export async function GET() {
	return redirect("https://www.producthunt.com/posts/supermemory");
}
