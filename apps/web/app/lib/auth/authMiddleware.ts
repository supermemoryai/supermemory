import { AppLoadContext, redirect } from "@remix-run/cloudflare";

import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { database, eq } from "@supermemory/db";
import { User, users } from "@supermemory/db/schema";

export const verifyOrCreateUser = async (
	request: Request,
	context: AppLoadContext,
): Promise<User | null> => {
	const session = await getSessionFromRequest(request, context);
	console.log(session);
	if (!session?.user?.id) {
		return null;
	}

	let user = await database(context.cloudflare.env.HYPERDRIVE.connectionString)
		.select()
		.from(users)
		.where(eq(users.uuid, session.user.id));

	if ((!user || user.length === 0) && session?.user?.id) {
		const newUser = await database(context.cloudflare.env.HYPERDRIVE.connectionString)
			.insert(users)
			.values({
				uuid: session.user?.id,
				email: session.user?.email,
				firstName: session.user?.firstName,
				lastName: session.user?.lastName,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: false,
				profilePictureUrl: session.user?.profilePictureUrl ?? "",
			})
			.returning();

		user = newUser;
	}

	if (!user) {
		return null;
	}

	return user[0];
};
