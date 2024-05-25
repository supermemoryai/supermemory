import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function PUT(request: NextRequest) {
  const d = await ensureAuth(request);

  if (!d) {
    return new Response("Unauthorized", { status: 401 });
  }

  const reqUrl = new URL(request.url);
  const filename = reqUrl.searchParams.get("filename");

  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  if (
    !process.env.R2_ENDPOINT ||
    !process.env.R2_ACCESS_ID ||
    !process.env.R2_SECRET_KEY ||
    !process.env.R2_BUCKET_NAME
  ) {
    return new Response(
      "Missing one or more R2 env variables: R2_ENDPOINT, R2_ACCESS_ID, R2_SECRET_KEY, R2_BUCKET_NAME. To get them, go to the R2 console, create and paste keys in a `.dev.vars` file in the root of this project.",
      { status: 500 },
    );
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_ID,
      secretAccessKey: process.env.R2_SECRET_KEY,
    },
  });

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: filename }),
    { expiresIn: 3600 },
  );

  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
