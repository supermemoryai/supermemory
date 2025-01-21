import { ActionFunctionArgs } from "@remix-run/cloudflare";
import { database, eq } from "@supermemory/db";
import { users } from "@supermemory/db/schema";
import { Stripe } from "stripe";
import { allowedEvents } from "~/lib/stripe.constants";
import { syncStripeDataToDb } from "~/lib/stripe";

export const action = async ({ request, context }: ActionFunctionArgs) => {
	const stripe = new Stripe(context.cloudflare.env.STRIPE_CHECKOUT_KEY);
	const db = await database(context.cloudflare.env.HYPERDRIVE.connectionString);

	const payload = await request.text();
	const signature = request.headers.get("stripe-signature");

	if (!signature) {
		return new Response(JSON.stringify({}), { status: 400 });
	}

	async function processEvent(event: Stripe.Event) {
		if (!allowedEvents.includes(event.type)) return;

		const { customer: customerId } = event.data.object as {
			customer: string;
		};

		if (typeof customerId !== "string") {
			throw new Error(
				`[STRIPE HOOK][ERROR] ID isn't string.\nEvent type: ${event.type}`
			);
		}

		const user = await db.query.users.findFirst({
			where: eq(users.stripeCustomerId, customerId),
		});

		if (!user) {
			throw new Error("[STRIPE HOOK] No user found for customer " + customerId);
		}

		await syncStripeDataToDb(user.uuid, db, context.cloudflare.env);
	}

	async function doEventProcessing() {
		if (typeof signature !== "string") {
			throw new Error("[STRIPE HOOK] Header isn't a string");
		}

		const event = stripe.webhooks.constructEvent(
			payload,
			signature,
			context.cloudflare.env.STRIPE_WEBHOOK_SECRET
		);

		await processEvent(event);
	}

	try {
		await doEventProcessing();
	} catch (error) {
		console.error("[STRIPE HOOK] Error processing event", error);
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
		},
	});
};
