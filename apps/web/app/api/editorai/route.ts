import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

// ERROR #2 - This the the next function that calls the backend, I sometimes think this is redundency, but whatever
// I have commented the auth code, It should not work in development, but it still does sometimes
export async function POST(request: NextRequest) {
	// const d = await ensureAuth(request);
	// if (!d) {
	//   return new Response("Unauthorized", { status: 401 });
	// }
	const res: { context: string; request: string } = await request.json();

	try {
		const resp = await fetch(
			`${process.env.BACKEND_BASE_URL}/api/editorai?context=${res.context}&request=${res.request}`,
		);
		// this just checks if there are erros I am keeping it commented for you to better understand the important pieces
		// if (resp.status !== 200 || !resp.ok) {
		//   const errorData = await resp.text();
		//   console.log(errorData);
		//   return new Response(
		//     JSON.stringify({ message: "Error in CF function", error: errorData }),
		//     { status: resp.status },
		//   );
		// }
		return new Response(resp.body, { status: 200 });
	} catch (error) {
		return new Response(`Error, ${error}`);
	}
}
