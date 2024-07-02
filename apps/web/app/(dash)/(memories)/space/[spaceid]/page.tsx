import { getMemoriesInsideSpace } from "@/app/actions/fetchers";
import { redirect } from "next/navigation";
import MemoriesPage from "../../content";

async function Page({ params: { spaceid } }: { params: { spaceid: number } }) {
  const { success, data } = await getMemoriesInsideSpace(spaceid);
  if (!success ?? !data) return redirect("/home");
  return (
    <MemoriesPage
      memoriesAndSpaces={{ memories: data.memories, spaces: [] }}
      title={data.spaces[0]?.name}
      currentSpace={data.spaces[0]}
    />
  );
}

export default Page;
