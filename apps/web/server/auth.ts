import { sendVerificationRequest } from '@/utils';
import NextAuth, { NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import Resend from "next-auth/providers/resend"
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
		Resend({
      
      		apiKey: process.env.RESEND_API_KEY,
			from: "onboarding@resend.dev",
			sendVerificationRequest
    	}), 
	],
});
