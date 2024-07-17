import { getAllUserMemoriesAndSpaces } from "@/app/actions/fetchers";
import { redirect } from "next/navigation";
import MemoriesPage from "../content";

async function Page() {
	const { success, data } = await getAllUserMemoriesAndSpaces();
	if (!success ?? !data) return redirect("/home");
	return <MemoriesPage memoriesAndSpaces={data} />;
}

export default Page;
