import { Hono } from "hono";
import { Env, Variables } from "../types";
import { and, database, desc, eq, isNotNull, or, sql } from "@supermemory/db";
import {
  chatThreads,
  savedSpaces,
  spaceAccess,
  spaces,
  users,
} from "@supermemory/db/schema";
import { decryptApiKey, getApiKey } from "../auth";
import { DurableObjectStore } from "@hono-rate-limiter/cloudflare";
import { rateLimiter } from "hono-rate-limiter";

const user = new Hono<{ Variables: Variables; Bindings: Env }>()
  .get("/", (c) => {
    return c.json(c.get("user"));
  })
  .get("/spaces", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = database(c.env.HYPERDRIVE.connectionString);

    const [allSpaces, savedSpacesList, spaceOwners] = await Promise.all([
      db
        .select({
          id: spaces.id,
          uuid: spaces.uuid,
          name: sql<string>`REGEXP_REPLACE(${spaces.name}, E'[\\n\\r]+', ' ', 'g')`.as(
            "name"
          ),
          ownerId: spaces.ownerId,
          isPublic: spaces.isPublic,
          createdAt: spaces.createdAt,
          accessType: spaceAccess.accessType,
        })
        .from(spaces)
        .leftJoin(
          spaceAccess,
          and(
            eq(spaces.id, spaceAccess.spaceId),
            eq(spaceAccess.userEmail, user.email),
            eq(spaceAccess.status, "accepted")
          )
        )
        .where(or(eq(spaces.ownerId, user.id), isNotNull(spaceAccess.spaceId)))
        .orderBy(desc(spaces.createdAt)),

      db
        .select({
          spaceId: savedSpaces.spaceId,
        })
        .from(savedSpaces)
        .where(eq(savedSpaces.userId, user.id)),

      db
        .select({
          id: users.id,
          uuid: users.uuid,
          name: users.firstName,
          email: users.email,
          profileImage: users.profilePictureUrl,
        })
        .from(users)
        .innerJoin(spaces, eq(spaces.ownerId, users.id)),
    ]);

    const savedSpaceIds = new Set(savedSpacesList.map((s) => s.spaceId));
    const ownerMap = new Map(spaceOwners.map((owner) => [owner.id, owner]));

    const spacesWithDetails = allSpaces.map((space) => {
      const isOwner = space.ownerId === user.id;
      const owner = ownerMap.get(space.ownerId);

      return {
        ...space,
        favorited: savedSpaceIds.has(space.id),
        permissions: {
          canRead: space.isPublic || isOwner || space.accessType != null,
          canEdit: isOwner || space.accessType === "edit",
          isOwner,
        },
        owner: isOwner
          ? null
          : {
              id: owner?.uuid,
              name: owner?.name,
              email: owner?.email,
              profileImage: owner?.profileImage,
            },
      };
    });

    return c.json({ spaces: spacesWithDetails });
  })
  .get("/history", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const history = await database(c.env.HYPERDRIVE.connectionString)
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.userId, user.id))
      .orderBy(desc(chatThreads.createdAt))
      .limit(10);

    return c.json({ history });
  })
  .get("/invitations", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = database(c.env.HYPERDRIVE.connectionString);

    const invitations = await db
      .select({
        spaceAccess: spaceAccess,
        spaceUuid: spaces.uuid,
        spaceName: spaces.name,
      })
      .from(spaceAccess)
      .innerJoin(spaces, eq(spaceAccess.spaceId, spaces.id))
      .where(eq(spaceAccess.userEmail, user.email))
      .limit(100);

    return c.json({ invitations });
  })
  .get(
    "/key",
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // we need user.id and user.lastApiKeyGeneratedAt
      const lastApiKeyGeneratedAt = user.lastApiKeyGeneratedAt?.getTime();
      if (!lastApiKeyGeneratedAt) {
        return c.json({ error: "No API key generated" }, 400);
      }

      const key = await getApiKey(
        user.uuid,
        lastApiKeyGeneratedAt.toString(),
        c
      );

      const decrypted = await decryptApiKey(key, c);
      return c.json({ key, decrypted });
    }
  )
  .post("/update", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();

    // Only allow updating specific safe fields
    const allowedFields = {
      firstName: true,
      lastName: true,
      profilePictureUrl: true,
      hasOnboarded: true,
    };

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields[key as keyof typeof allowedFields]) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const db = database(c.env.HYPERDRIVE.connectionString);

    await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return c.json({ success: true });
  })

export default user;
