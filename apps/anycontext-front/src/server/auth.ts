import { env } from "@/env";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { DefaultSession } from "next-auth";
import { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { createTable } from "./db/schema";

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    session: ({session, token}) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        token
      },
    })
  },
  adapter: DrizzleAdapter(db, createTable) as Adapter,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
  ],
});
