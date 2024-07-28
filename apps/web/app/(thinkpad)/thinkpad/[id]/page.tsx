import { userHasCanvas } from "@/app/actions/fetchers";
import ResizableLayout from "@/components/canvas/resizablelayout";
import { redirect } from "next/navigation";
export default async function page({ params }: any) {
	const canvasExists = await userHasCanvas(params.id);
	if (!canvasExists.success) {
		redirect("/thinkpad");
	}
	return <ResizableLayout id={params.id} />;
}
