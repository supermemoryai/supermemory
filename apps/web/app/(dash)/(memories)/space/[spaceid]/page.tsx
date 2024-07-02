import { getMemoriesInsideSpace } from "@/app/actions/fetchers";
import { redirect } from "next/navigation";
import MemoriesPage from "../../content";
import { db } from "@/server/db";
import { and, eq } from "drizzle-orm";
import { spacesAccess } from "@/server/db/schema";

async function Page({ params: { spaceid } }: { params: { spaceid: number } }) {
  const { success, data } = await getMemoriesInsideSpace(spaceid);
  if (!success ?? !data) return redirect("/home");

  const hasAccess = await db.query.spacesAccess.findMany({
    where: and(eq(spacesAccess.spaceId, spaceid)),
  });

  return (
    <MemoriesPage
      memoriesAndSpaces={{ memories: data.memories, spaces: [] }}
      title={data.spaces[0]?.name}
      currentSpace={data.spaces[0]}
      usersWithAccess={hasAccess.map((x) => x.userEmail) ?? []}
    />
  );
}

export default Page;
