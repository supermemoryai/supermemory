import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { database, eq } from "@supermemory/db";
import { users } from "@supermemory/db/schema";
import { Stripe } from "stripe";

const productsMap = {
	development: {
		"tier-standard-monthly": "price_1Qh6XVP0SZYla2tY19VFeVr6",
		"tier-standard-yearly": "price_1Qh6Y3P0SZYla2tYWXsBH9cv",
		"tier-lifetime": "price_1Qh6YaP0SZYla2tYLfoFQ9Op",
	},
	production: {
		"tier-standard-monthly": "price_1Qh4ozP0SZYla2tYeQEgWirz",
		"tier-standard-yearly": "price_1Qh4ozP0SZYla2tYw4T75Vbn",
		"tier-lifetime": "price_1Qh4p0P0SZYla2tYvBxNomWS",
	},
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const tier = new URL(request.url).searchParams.get("tier");

	const user = await getSessionFromRequest(request, context);
	const db = await database(context.cloudflare.env.HYPERDRIVE.connectionString);
	const stripe = new Stripe(context.cloudflare.env.STRIPE_CHECKOUT_KEY);

	let userInDb = await db.query.users.findFirst({
		where: eq(users.uuid, user?.user?.id ?? ""),
	});

	if (!userInDb) {
		return redirect("/");
	}

	if (!userInDb.stripeCustomerId) {
		// create one.
		const newCustomer = await stripe.customers.create({
			email: userInDb.email,
			metadata: {
				userId: userInDb.uuid,
			},
		});
		userInDb = (
			await db
				.update(users)
				.set({
					stripeCustomerId: newCustomer.id,
				})
				.where(eq(users.uuid, userInDb.uuid))
				.returning()
		)[0];
	}

	if (!userInDb || !userInDb.stripeCustomerId) {
		return redirect("/");
	}

	if (!tier || typeof tier == undefined || tier == null) {
		return {
			error: "No tier specified",
			status: 400,
		};
	}

	const validTiers = Object.keys(productsMap.development);
	if (!validTiers.includes(tier)) {
		return {
			error: "Invalid tier specified. Valid tiers are: " + validTiers.join(", "),
			status: 400,
		};
	}

	const isDev = context.cloudflare.env.NODE_ENV === "development";
	const redirectUrl = isDev ? "http://localhost:3000" : "https://supermemory.ai";

	const url = await stripe.checkout.sessions.create({
		success_url: redirectUrl + "/pay/stripe/callback?success=true",
		mode: tier.includes("lifetime") ? "payment" : "subscription",
		customer: userInDb.stripeCustomerId,
		line_items: [
			{
				quantity: 1,
				price:
					productsMap[isDev ? "development" : "production"][
						tier as keyof (typeof productsMap)["development"]
					],
			},
		],
	});

	return redirect(url.url ?? "error");
};
