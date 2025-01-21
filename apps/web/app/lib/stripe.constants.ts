import Stripe from "stripe";

export const allowedEvents = [
	"checkout.session.completed",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"customer.subscription.paused",
	"customer.subscription.resumed",
	"customer.subscription.pending_update_applied",
	"customer.subscription.pending_update_expired",
	"customer.subscription.trial_will_end",
	"invoice.paid",
	"invoice.payment_failed",
	"invoice.payment_action_required",
	"invoice.upcoming",
	"invoice.marked_uncollectible",
	"invoice.payment_succeeded",
	"payment_intent.succeeded",
	"payment_intent.payment_failed",
	"payment_intent.canceled",
] as Stripe.Event.Type[];

export type STRIPE_SUB_CACHE =
	| {
			subscriptionId: string | null;
			status: Stripe.Subscription.Status;
			priceId: string | null;
			currentPeriodStart: number | null;
			currentPeriodEnd: number | null;
			cancelAtPeriodEnd: boolean;
			paymentMethod: {
				brand: string | null; // e.g., "visa", "mastercard"
				last4: string | null; // e.g., "4242"
			} | null;
	  }
	| {
			status: "none";
	  };
