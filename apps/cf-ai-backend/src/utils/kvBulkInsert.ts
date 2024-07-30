import { KVBulkItem } from "../types";

export const bulkInsertKv = async (
	credentials: {
		CF_KV_AUTH_TOKEN: string;
		KV_NAMESPACE_ID: string;
		CF_ACCOUNT_ID: string;
	},
	keyData: {
		chunkIds: Array<string>;
		urlid: string;
	},
) => {
	const data: Array<KVBulkItem> = keyData.chunkIds.map((chunkId) => ({
		key: chunkId,
		value: keyData.urlid,
		base64: false,
	}));

	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${credentials.CF_ACCOUNT_ID}/storage/kv/namespaces/${credentials.KV_NAMESPACE_ID}/bulk`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${credentials.CF_KV_AUTH_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			},
		);

		if (!response.ok) {
			throw new Error(
				`can't insert bulk to kv because ${response.status} ${response.statusText} ${JSON.stringify(response.body)}`,
			);
		}
		return await response.json();
	} catch (e) {
		//dosomething
		throw e;
	}
};
