import NextAuth, { NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";


console.log(`Google Client ID being used:, ${process.env.GOOGLE_CLIENT_ID} and the secret is ${process.env.GOOGLE_CLIENT_SECRET}`);

export const {
	handlers: { GET, POST },
	signIn,
	signOut,
	auth,
} = NextAuth({
	secret: process.env.BACKEND_SECURITY_KEY,
	trustHost: true,
	// callbacks: {
	//   session: ({ session, token, user }) => ({
	//     ...session,
	//     user: {
	//       ...session.user,
	//     },
	//   }),
	// },
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}),
	],
});
