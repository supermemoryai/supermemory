import { db } from "@/server/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import {
  contentToSpace,
  sessions,
  storedContent,
  users,
  space,
} from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { getMetaData } from "@/lib/get-metadata";
import { ensureAuth } from "../ensureAuth";
import { limit } from "@/app/actions/doers";
import { LIMITS } from "@/lib/constants";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const session = await ensureAuth(req);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = (await req.json()) as {
    pageContent: string;
    url: string;
    spaces?: string[];
  };

  const metadata = await getMetaData(data.url);
  let storeToSpaces = data.spaces;

  if (!storeToSpaces) {
    storeToSpaces = [];
  }

  if (!(await limit(session.user.id))) {
    return NextResponse.json(
      {
        message: "Error: Ratelimit exceeded",
        error: `You have exceeded the limit of ${LIMITS["page"]} pages.`,
      },
      { status: 429 },
    );
  }

  const rep = await db
    .insert(storedContent)
    .values({
      content: data.pageContent,
      title: metadata.title,
      description: metadata.description,
      url: data.url,
      baseUrl: metadata.baseUrl,
      image: metadata.image,
      savedAt: new Date(),
      userId: session.user.id,
    })
    .returning({ id: storedContent.id });

  const id = rep[0]?.id;

  if (!id) {
    return NextResponse.json(
      { message: "Error", error: "Error in CF function" },
      { status: 500 },
    );
  }

  if (storeToSpaces.length > 0) {
    const spaceData = await db
      .select()
      .from(space)
      .where(
        and(
          inArray(space.name, storeToSpaces ?? []),
          eq(space.user, session.user.id),
        ),
      )
      .all();

    await Promise.all([
      spaceData.forEach(async (space) => {
        await db
          .insert(contentToSpace)
          .values({ contentId: id, spaceId: space.id });
      }),
    ]);
  }

  const res = (await Promise.race([
    fetch("https://cf-ai-backend.dhravya.workers.dev/add", {
      method: "POST",
      headers: {
        "X-Custom-Auth-Key": process.env.BACKEND_SECURITY_KEY,
      },
      body: JSON.stringify({ ...data, user: session.user.email }),
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 40000),
    ),
  ])) as Response;

  if (res.status !== 200) {
    console.log(res.status, res.statusText);
    return NextResponse.json(
      { message: "Error", error: "Error in CF function" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "OK", data: "Success" }, { status: 200 });
}
