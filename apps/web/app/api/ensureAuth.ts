import { NextRequest } from "next/server";
import { db } from "../../server/db";
import { accounts, sessions, users } from "../../server/db/schema";
import { eq } from "drizzle-orm";

export async function ensureAuth(req: NextRequest) {
	// A helper function to protect routes

	const token =
		req.cookies.get("next-auth.session-token")?.value ??
		req.cookies.get("__Secure-authjs.session-token")?.value ??
		req.cookies.get("authjs.session-token")?.value ??
		req.headers.get("Authorization")?.replace("Bearer ", "");

	if (!token) {
		return undefined;
	}

	let sessionData = await db
		.select()
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.sessionToken, token!));

	const isMobile =
		token.split("?") && token.split("?")[1] === `source="mobile"`;

	if (isMobile) {
		// remove everything after ? in token
		const newToken = token.split("?").slice(0, -1).join("?");

		console.log(token, newToken);

		const authUserFetch = await fetch(
			`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${newToken}`,
		);

		if (!authUserFetch.ok) {
			console.error(
				"Error fetching Google user,",
				authUserFetch.statusText,
				await authUserFetch.text(),
			);
			console.log("Google user not found or error.");
			return undefined;
		}

		const authUserData = (await authUserFetch.json()) as {
			email: string;
			audience: string;
			issued_to: string;
		};

		console.log(authUserData);

		if (
			!(
				authUserData.audience.split("-")[0] ===
					process.env.GOOGLE_CLIENT_ID.split("-")[0] &&
				authUserData.issued_to.split("-")[0] ===
					process.env.GOOGLE_CLIENT_ID.split("-")[0]
			)
		) {
			console.log(
				"Google user not authorized because of audience or issued_to mismatch",
			);
			return undefined;
		}

		const authUserEmail = authUserData.email;

		let user = await db
			.select()
			.from(users)
			.where(eq(users.email, authUserEmail))
			.limit(1);

		if (!user || user.length === 0) {
			// create the user
			user = await db
				.insert(users)
				.values({
					email: authUserEmail,
					name: authUserEmail.split("@")[0],
				})
				.returning();
		}

		sessionData = [
			{
				...sessionData[0]!,
				user: user[0]!,
			},
		];
	}

	if (!sessionData || sessionData.length === 0) {
		return undefined;
	}

	return {
		user: sessionData[0]!.user,
		session: sessionData[0]!,
	};
}
