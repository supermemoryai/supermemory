import { database, eq } from "@supermemory/db";
import { users } from "@supermemory/db/schema";
import { Stripe } from "stripe";
import { allowedEvents } from "./stripe.constants";

export async function syncStripeDataToDb(
	userId: string,
	db: ReturnType<typeof database>,
	env: Env,
) {
	const stripe = new Stripe(env.STRIPE_CHECKOUT_KEY);

	const user = await db.query.users.findFirst({
		where: eq(users.uuid, userId),
	});

	if (!user || !user.stripeCustomerId) {
		return;
	}

	// Get latest subscription data
	const subscriptions = await stripe.subscriptions.list({
		customer: user.stripeCustomerId,
		limit: 1,
		status: "all",
		expand: ["data.default_payment_method"],
	});

	// Get one-time purchases
	const charges = await stripe.charges.list({
		customer: user.stripeCustomerId,
		limit: 100,
	});

	// Default to free tier
	let tier: "free" | "premium" = "free";

	// Check subscriptions first
	if (subscriptions.data.length > 0) {
		const subscription = subscriptions.data[0];
		if (subscription.status === "active") {
			tier = "premium";
		}
	}

	// Check one-time purchases if no active subscription
	if (tier === "free" && charges.data.length > 0) {
		// Look for successful lifetime purchase
		const lifetimePurchase = charges.data.find((charge) => charge.paid && charge.amount >= 19900);
		if (lifetimePurchase) {
			tier = "premium";
		}
	}

	// Update user tier in database
	await db
		.update(users)
		.set({
			tier,
			updatedAt: new Date(),
		})
		.where(eq(users.uuid, userId));

	return {
		tier,
		customerId: user.stripeCustomerId,
		subscription: subscriptions.data[0] || null,
		charges: charges.data,
	};
}