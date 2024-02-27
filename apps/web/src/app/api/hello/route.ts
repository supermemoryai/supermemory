import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { Ai } from '@cloudflare/ai'
import type {
  VectorizeIndex,
  Fetcher,
  Request,
} from "@cloudflare/workers-types";

import {
  CloudflareVectorizeStore,
  CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import { db } from '@/server/db';
import { sessions, users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'edge'

declare global {
  interface CloudflareEnv {
    VECTORIZE_INDEX: VectorizeIndex;
  }
}

export async function POST(req: NextRequest) {

  const token = req.cookies.get("next-auth.session-token")?.value ?? req.cookies.get("__Secure-authjs.session-token")?.value ?? req.cookies.get("authjs.session-token")?.value ?? req.headers.get("Authorization")?.replace("Bearer ", "");

  console.log(process.env.AI)
  // if (!process.env.AI || !vec) {
  //   return new Response(JSON.stringify({ message: "Missing cloudflare bindings" }), { status: 500 });
  // }

  const user = await db.select().from(sessions).where(eq(sessions.sessionToken, token!))
    .leftJoin(users, eq(sessions.userId, users.id)).limit(1)

  const vec = getRequestContext().env.VECTORIZE_INDEX;

  console.log(vec ? vec : "Vector index not found")


  if (!user || user.length === 0) {
    return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
  }

  const embeddings = new CloudflareWorkersAIEmbeddings({
    binding: process.env.AI,
    modelName: "@cf/baai/bge-small-en-v1.5",
  });
  const store = new CloudflareVectorizeStore(embeddings, {
    index: vec,
  });

  const body = await req.json() as {
    pageContent: string,
    title?: string,
    description?: string,
    url: string,
  };


  if (!body.pageContent || !body.url) {
    return new Response(JSON.stringify({ message: "Invalid Page Content" }), { status: 400 });
  }

  await store.addDocuments([
    {
      pageContent: body.pageContent,
      metadata: {
        title: body.title ?? "",
        description: body.description ?? "",
        url: body.url,
        user: user[0].user!.name
      },
    }
  ])

  const filter: VectorizeVectorMetadataFilter = {
    user: {
      $eq: user[0].user!.name
    }
  }

  const resp = await store.similaritySearch(body.pageContent, 5, filter)

  return new Response(JSON.stringify({ message: "OK", data: resp }), { status: 200 });
}