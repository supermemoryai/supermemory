// invitation page. user should be logged in to see this page.
import { useEffect } from "react";

import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";

import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { Space } from "@supermemory/db/schema";
import posthog from "posthog-js";
import { proxy } from "server/proxy";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
	const user = await getSessionFromRequest(request, context);
	if (!user) {
		return redirect("/signin");
	}

	const spaceId = params.spaceId?.split("---")[0];

	if (!spaceId) {
		return redirect("/");
	}

	try {
		// Check if user has pending invitation
		const response = await proxy(`/api/spaces/${spaceId}/invitation`, {}, request, context);

		const myJson = await response.json();

		console.log(myJson);

		const invitation = myJson as {
			space: Space;
			accessType: "read" | "edit";
		};
		return json({ invitation, user });
	} catch (error) {
		// If 403, there's no invitation found
		if (error instanceof Error && error.message.includes("403")) {
			return redirect("/");
		}
		throw error;
	}
}

export default function SpaceInvitation() {
	const { invitation, user } = useLoaderData<typeof loader>();
	console.log(invitation);
	const navigate = useNavigate();


	async function handleInviteResponse(action: "accept" | "reject") {
		const response = await fetch(`/backend/api/spaces/invites/${action}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				spaceId: invitation.space.uuid,
			}),
			credentials: "include",
		});

		if (response.ok) {
			// Redirect to space page after accepting/rejecting
			navigate(`/space/${invitation.space.uuid}`);
		} else {
			console.log("Error accepting/rejecting invitation", response);
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6 text-blue-600 dark:text-blue-300"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
						</svg>
					</div>
					<CardTitle className="text-2xl font-bold">Space Invitation</CardTitle>
					<CardDescription className="mt-2">
						You've been invited to join{" "}
						<span className="font-medium text-blue-600 dark:text-blue-400">
							{invitation.space.name}
						</span>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
							<p className="text-sm text-gray-600 dark:text-gray-300">
								Access Level:{" "}
								<span className="font-medium capitalize">{invitation.accessType}</span>
							</p>
						</div>
						<div className="flex flex-col sm:flex-row gap-3">
							<Button
								onClick={() => handleInviteResponse("accept")}
								className="flex-1 bg-blue-600 hover:bg-blue-700"
							>
								Accept Invitation
							</Button>
							<Button
								onClick={() => handleInviteResponse("reject")}
								variant="outline"
								className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								Decline
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
