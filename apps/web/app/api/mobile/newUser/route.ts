import { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const newMobileUserBody = z.object({
	// this is a string in the format
	encodedUserString: z.string(),
});

export async function POST(req: NextRequest) {
	const body = await req.json();
}
