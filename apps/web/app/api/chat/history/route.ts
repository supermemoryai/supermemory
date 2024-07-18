import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	return new Response("Hello, World!");
}
