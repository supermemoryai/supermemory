import { ActionFunctionArgs, redirect } from "@remix-run/cloudflare";

import { CoreMessage, UserContent } from "ai";
import { assertNotString } from "~/lib/types/safety";

export async function action({ request, context }: ActionFunctionArgs) {
	const formData = await request.formData();
	const input = formData.get("input") as string;


	const fileURLs = (JSON.parse(formData.get("fileURLs") as string) as string[])?.map((url) =>
		decodeURIComponent(url),
	);

	const messages = [
		{
			role: "user",
			content: [
				{
					type: "text",
					text: input,
				},
			],
		},
	] satisfies CoreMessage[];

	function getMimeType(url: string) {
		const extension = url.split(".").pop();
		switch (extension) {
			case "pdf":
				return "application/pdf";
			case "jpg":
			case "jpeg":
				return "image/jpeg";
			case "png":
				return "image/png";
			default:
				return "application/pdf";
		}
	}

	fileURLs?.forEach((url) => {
		// Decide the mimetype properly b ased on the file extension
		const mimeType = getMimeType(url);

		if (typeof messages[0].content !== "string") {
			assertNotString(messages[0].content as UserContent).push({
				type: "file",
				data: encodeURI(url),
				mimeType,
			});
		}
	});

	const base64Messages = btoa(JSON.stringify(messages));

	return redirect(`/chat/new?q=${base64Messages}`);
}

export const loader = () => redirect("/", { status: 404 });
