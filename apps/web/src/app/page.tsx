import { db } from "@/server/db";
import {
  contentToSpace,
  sessions,
  space,
  StoredContent,
  storedContent,
  users,
} from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar/index";
import Main from "@/components/Main";
import MessagePoster from "./MessagePoster";
import { transformContent } from "../../types/memory";
import { MemoryProvider } from "@/contexts/MemoryContext";
import Content from "./content";

export const runtime = "edge";

export default async function Home() {
  const token =
    cookies().get("next-auth.session-token")?.value ??
    cookies().get("__Secure-authjs.session-token")?.value ??
    cookies().get("authjs.session-token")?.value ??
    headers().get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return redirect("/api/auth/signin");
  }

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!session || session.length === 0) {
    return redirect("/api/auth/signin");
  }

  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!userData) {
    return redirect("/api/auth/signin");
  }

  // Fetch all content for the user
  const contents = await db
    .select()
    .from(storedContent)
    .where(eq(storedContent.user, userData.id))
    .all();

  const collectedSpaces =
    contents.length > 0 ? await transformContent(contents) : [];

  // collectedSpaces.push({
  //   id: 2,
  //   title: "Test",
  //   content: [
  //     {
  //       id: 1,
  //       content: "Test",
  //       title: "Vscode",
  //       description: "Test",
  //       url: "https://vscode-remake.vercel.app/",
  //       savedAt: new Date(),
  //       baseUrl: "https://vscode-remake.vercel.app/",
  //       image: "https://vscode-remake.vercel.app/favicon.svg",
  //     },
  //   ],
  // });

  return (
    <MemoryProvider spaces={collectedSpaces} freeMemories={[]}>
      <Content jwt={token} />
      {/* <MessagePoster jwt={token} /> */}
    </MemoryProvider>
  );
}
