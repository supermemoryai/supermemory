export function GET(req: Request) {
	const id = new URL(req.url).searchParams.get("id");
	return new Response(JSON.stringify(id));
}

export async function POST(req: Request) {
	const body = await req.json();
	const id = new URL(req.url).searchParams.get("id");
	return new Response(JSON.stringify({ body, id }));
}
