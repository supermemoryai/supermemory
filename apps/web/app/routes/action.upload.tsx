import { ActionFunctionArgs, UploadHandler, json } from "@remix-run/cloudflare";

import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { AwsClient } from "aws4fetch";

export async function action({ request, context }: ActionFunctionArgs) {
	const user = await getSessionFromRequest(request, context);

	if (!user) {
		return json(
			{
				error: "Unauthorized",
			},
			{ status: 401 },
		);
	}

	const file = await request.formData();
	const fileObject = file.get("file") as File;

	// Check if the file is too large
	if (fileObject.size > 10 * 1024 * 1024) {
		return json(
			{
				error: "File too large",
			},
			{ status: 413 },
		);
	}

	const arrayBuffer = await fileObject.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	const client = new AwsClient({
		accessKeyId: context.cloudflare.env.R2_ACCESS_KEY_ID,
		secretAccessKey: context.cloudflare.env.R2_SECRET_ACCESS_KEY,
	});

	const timestamp = Date.now();
	const uniqueFileName = `${timestamp}-${fileObject.name}`;
	const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

	const response = await client.fetch(
		`https://supermemory-images.${context.cloudflare.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${user.user.id}/${uniqueFileName}`,
		{
			method: "PUT",
			body: uint8Array,
			headers: {
				"Content-Type": fileObject.type,
				"x-amz-expires": expirationDate.toUTCString(),
			},
		},
	);

	if (response.status !== 200) {
		console.error("Failed to upload file:", response);
		return json(
			{
				error: "Failed to upload file",
			},
			{ status: response.status },
		);
	}

	return json({
		success: true,
		url: `https://media.supermemory.ai/${user.user.id}/${uniqueFileName}`,
	});
}
