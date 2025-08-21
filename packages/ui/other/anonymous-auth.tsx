"use client";

import { authClient } from "@lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const AnonymousAuth = ({
	dashboardPath = "/dashboard",
	loginPath = "/login",
}) => {
	const router = useRouter();

	useEffect(() => {
		const createAnonymousSession = async () => {
			const session = await authClient.getSession();

			if (!session?.session) {
				console.debug(
					"[ANONYMOUS_AUTH] No session found, creating anonymous session...",
				);

				try {
					// Create anonymous session
					console.debug("[ANONYMOUS_AUTH] Calling signIn.anonymous()...");
					const res = await authClient.signIn.anonymous();

					if (!res.token) {
						throw new Error("Failed to get anonymous token");
					}

					// Get the new session
					console.debug(
						"[ANONYMOUS_AUTH] Getting new session with anonymous token...",
					);
					const newSession = await authClient.getSession();

					console.debug("[ANONYMOUS_AUTH] New session retrieved:", newSession);

					if (!newSession?.session || !newSession?.user) {
						console.error(
							"[ANONYMOUS_AUTH] Failed to create anonymous session - missing session or user",
						);
						throw new Error("Failed to create anonymous session");
					}

					// Get the user's organization
					console.debug(
						"[ANONYMOUS_AUTH] Fetching organizations for anonymous user...",
					);
					const orgs = await authClient.organization.list();

					console.debug("[ANONYMOUS_AUTH] Organizations retrieved:", {
						count: orgs?.length || 0,
						orgs: orgs?.map((o) => ({
							id: o.id,
							name: o.name,
							slug: o.slug,
						})),
					});

					const org = orgs?.[0];
					if (!org) {
						console.error(
							"[ANONYMOUS_AUTH] No organization found for anonymous user",
						);
						throw new Error("Failed to get organization for anonymous user");
					}

					// Redirect to the organization dashboard
					console.debug(
						`[ANONYMOUS_AUTH] Redirecting anonymous user to /${org.slug}${dashboardPath}`,
					);
					router.push(dashboardPath);
				} catch (error) {
					console.error(
						"[ANONYMOUS_AUTH] Anonymous session creation error:",
						error,
					);
					console.error("[ANONYMOUS_AUTH] Error details:", {
						message: error instanceof Error ? error.message : "Unknown error",
						stack: error instanceof Error ? error.stack : undefined,
					});
					router.push(loginPath);
				}
			} else if (session.session) {
				// Session exists, handle organization routing
				console.debug(
					"[ANONYMOUS_AUTH] Session exists, checking organization...",
				);

				if (!session.session.activeOrganizationId) {
					console.debug(
						"[ANONYMOUS_AUTH] No active organization ID, fetching organizations...",
					);
					const orgs = await authClient.organization.list();

					console.debug("[ANONYMOUS_AUTH] Organizations for existing user:", {
						count: orgs?.length || 0,
						orgs: orgs?.map((o) => ({
							id: o.id,
							name: o.name,
							slug: o.slug,
						})),
					});

					if (orgs?.[0]) {
						console.debug(
							`[ANONYMOUS_AUTH] Setting active organization to ${orgs[0].id}`,
						);
						await authClient.organization.setActive({
							organizationId: orgs[0].id,
						});
						console.debug(
							`[ANONYMOUS_AUTH] Redirecting to /${orgs[0].slug}${dashboardPath}`,
						);
						router.push(dashboardPath);
					}
				} else {
					console.debug(
						`[ANONYMOUS_AUTH] Active organization ID: ${session.session.activeOrganizationId}`,
					);
					console.debug(
						"[ANONYMOUS_AUTH] Fetching full organization details...",
					);
					const org = await authClient.organization.getFullOrganization({
						query: {
							organizationId: session.session.activeOrganizationId,
						},
					});

					console.debug("[ANONYMOUS_AUTH] Full organization retrieved:", {
						id: org.id,
						name: org.name,
						slug: org.slug,
					});

					console.debug(
						`[ANONYMOUS_AUTH] Redirecting to /${org.slug}${dashboardPath}`,
					);
					router.push(dashboardPath);
				}
			}
		};

		createAnonymousSession();
	}, [router.push]);

	// Return null as this component only handles the redirect logic
	return null;
};
