import { redirect } from "next/navigation";

export default async function GET() {
	return redirect("/home");
}
