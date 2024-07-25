import { userHasCanvas } from "@/app/actions/fetchers";
import {
	RectProvider,
	ResizaleLayout,
} from "@/components/canvas/resizableLayout";
import { redirect } from "next/navigation";
export default async function page({ params }: any) {
	const canvasExists = await userHasCanvas(params.id);
	if (!canvasExists.success) {
		redirect("/canvas");
	}
	return (
		<RectProvider id={params.id}>
			<ResizaleLayout />
		</RectProvider>
	);
}
