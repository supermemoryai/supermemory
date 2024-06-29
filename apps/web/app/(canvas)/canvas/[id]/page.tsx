import { userHasCanvas } from "@/app/actions/fetchers";
import { redirect } from "next/navigation";
import {
  RectProvider,
  ResizaleLayout,
} from "../_canvas_comp/(components)/resizableLayout";

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
