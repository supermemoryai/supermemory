import { env } from "@/env";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    session: ({ session, token, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
});
