import { Context, Next } from "hono";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { and, database, eq, sql } from "@supermemory/db";
import { User, users } from "@supermemory/db/schema";
import { Env, Variables } from "./types";
import { encrypt, decrypt } from "./utils/cipher";

interface EncryptedData {
  userId: string;
  lastApiKeyGeneratedAt: string;
}

export const getApiKey = async (
  userId: string,
  lastApiKeyGeneratedAt: string,
  c: Context<{ Variables: Variables; Bindings: Env }>
) => {
  const data = `${userId}-${lastApiKeyGeneratedAt}`;
  return "sm_" + (await encrypt(data, c.env.WORKOS_COOKIE_PASSWORD));
};

export const decryptApiKey = async (
  encryptedKey: string,
  c: Context<{ Variables: Variables; Bindings: Env }>
): Promise<EncryptedData> => {
  const ourKey = encryptedKey.slice(3);
  const decrypted = await decrypt(ourKey, c.env.WORKOS_COOKIE_PASSWORD);
  const [userId, lastApiKeyGeneratedAt] = decrypted.split("-");

  return {
    userId,
    lastApiKeyGeneratedAt,
  };
};

export const auth = async (
  c: Context<{ Variables: Variables; Bindings: Env }>,
  next: Next
) => {
  // Handle CORS preflight requests
  if (c.req.method === "OPTIONS") {
    return next()
  }

  // Set cache control headers
  c.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  let user: User | User[] | undefined;

  // Check for API key authentication first
  const authHeader = c.req.raw.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    try {
      const { userId, lastApiKeyGeneratedAt } = await decryptApiKey(apiKey, c);
      
      // Look up user with matching id and lastApiKeyGeneratedAt
      user = await database(c.env.HYPERDRIVE.connectionString)
        .select()
        .from(users)
        .where(
          and(
            eq(users.uuid, userId)
          )
        )
        .limit(1);

      if (user && Array.isArray(user)) {
        user = user[0];
        if (user && user.lastApiKeyGeneratedAt?.getTime() === Number(lastApiKeyGeneratedAt)) {
          c.set("user", user);
        } else {
          return c.json({ error: "Invalid API key - user not found" }, 401);
        }
      }
    } catch (err) {
      console.error("API key authentication failed:", err);
      return c.json({ error: "Invalid API key format" }, 401);
    }
  }

  // If no user found via API key, try cookie authentication
  if (!user) {
    const cookies = c.req.raw.headers.get("Cookie");
    if (cookies) {
      // Fake remix context object. this just works.
      const context = {
        cloudflare: {
          env: c.env,
        },
      };

      const session = await getSessionFromRequest(c.req.raw, context);
      console.log("Session", session);
      c.set("session", session);

      if (session?.user?.id) {
        user = await database(c.env.HYPERDRIVE.connectionString)
          .select()
          .from(users)
          .where(eq(users.uuid, session.user.id))
          .limit(1);

        if ((!user || user.length === 0) && session?.user?.id) {
          const newUser = await database(c.env.HYPERDRIVE.connectionString)
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
            .returning()
            .onConflictDoUpdate({
              target: [users.email],
              set: {
                uuid: session.user.id,
              },
            });

          user = newUser[0];
        }

        user = Array.isArray(user) ? user[0] : user;
        c.set("user", user);
        console.log("User", user);
      }
    }
  }

  // Check if request requires authentication
  const isPublicSpaceRequest =
    c.req.url.includes("/api/spaces/") || c.req.url.includes("/api/memories");

  if (!isPublicSpaceRequest && !c.get("user")) {
    console.log("Unauthorized access to", c.req.url);
    if (authHeader) {
      return c.json({ error: "Invalid authentication credentials" }, 401);
    } else {
      return c.json({ error: "Authentication required" }, 401);
    }
  }

  return next();
};
