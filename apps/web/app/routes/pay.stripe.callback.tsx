import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { database } from "@supermemory/db";
import { syncStripeDataToDb } from "~/lib/stripe";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const success = new URL(request.url).searchParams.get("success");
	const user = await getSessionFromRequest(request, context);

	if (!user?.user?.id) {
		return redirect("/");
	}

	if (success === "true") {
		const db = await database(context.cloudflare.env.HYPERDRIVE.connectionString);
		await syncStripeDataToDb(user.user.id, db, context.cloudflare.env);
	}

	return redirect("/success");
};
