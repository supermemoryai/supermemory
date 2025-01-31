import { Hono } from "hono";
import { Env, Variables } from "../types";
import { and, database, desc, eq, isNotNull, or, sql } from "@supermemory/db";
import {
  contentToSpace,
  documents,
  savedSpaces,
  spaceAccess,
  spaces,
  users,
} from "@supermemory/db/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomId } from "@supermemory/shared";

const spacesRoute = new Hono<{ Variables: Variables; Bindings: Env }>()
  .get("/", async (c) => {
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
  }).get("/:spaceId", async (c) => {
    const user = c.get("user");
    const spaceId = c.req.param("spaceId");
    const db = database(c.env.HYPERDRIVE.connectionString);
  
    const space = await db
      .select()
      .from(spaces)
      .where(eq(spaces.uuid, spaceId))
      .limit(1);
  
    if (!space[0]) {
      return c.json({ error: "Space not found" }, 404);
    }
  
    // For public spaces, anyone can read but only owner can edit
    if (space[0].isPublic) {
      const canEdit = user?.id === space[0].ownerId;
      return c.json({
        ...space[0],
        permissions: {
          canRead: true,
          canEdit,
          isOwner: space[0].ownerId === user?.id,
        },
      });
    }
  
    // For private spaces, require authentication
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Check if user is owner or has access via spaceAccess
    const isOwner = space[0].ownerId === user.id;
    let canEdit = isOwner;
    if (!isOwner) {
      const spaceAccessCheck = await db
        .select()
        .from(spaceAccess)
        .where(
          and(
            eq(spaceAccess.spaceId, space[0].id),
            eq(spaceAccess.userEmail, user.email),
            eq(spaceAccess.status, "accepted")
          )
        )
        .limit(1);
  
      if (spaceAccessCheck.length === 0) {
        return c.json({ error: "Access denied" }, 403);
      }
  
      canEdit = spaceAccessCheck[0].accessType === "edit";
    }
  
    return c.json({
      ...space[0],
      permissions: {
        canRead: true,
        canEdit,
        isOwner: space[0].ownerId === user.id,
      },
    });
  })
  .post(
    "/create",
    zValidator(
      "json",
      z.object({
        spaceName: z.string().min(1, "Space name cannot be empty").max(100),
        isPublic: z.boolean(), // keep this explicit please
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = database(c.env.HYPERDRIVE.connectionString);
      const uuid = randomId();

      try {
        const space = await db
          .insert(spaces)
          .values({
            name: body.spaceName.trim(),
            ownerId: user.id,
            uuid,
            isPublic: body.isPublic,
            createdAt: new Date(),
          })
          .returning();

        return c.json({
          message: "Space created successfully",
          space: {
            uuid: space[0].uuid,
            name: space[0].name,
            ownerId: space[0].ownerId,
            isPublic: space[0].isPublic,
            createdAt: space[0].createdAt,
          },
        });
      } catch (error) {
        console.error("[Space Creation Error]", error);
        return c.json({ error: "Failed to create space" }, 500);
      }
    }
  )
  .post(
    "/:spaceId/favorite",
    zValidator(
      "param",
      z.object({
        spaceId: z.string(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { spaceId } = c.req.valid("param");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = database(c.env.HYPERDRIVE.connectionString);

      // Get space details
      const space = await db
        .select()
        .from(spaces)
        .where(eq(spaces.uuid, spaceId))
        .limit(1);

      if (!space[0]) {
        return c.json({ error: "Space not found" }, 404);
      }

      // Check if it's user's own space
      if (space[0].ownerId === user.id) {
        return c.json({ error: "Cannot favorite your own space" }, 400);
      }

      try {
        await db.insert(savedSpaces).values({
          userId: user.id,
          spaceId: space[0].id,
          savedAt: new Date(),
        });

        return c.json({ message: "Space favorited successfully" });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("saved_spaces_user_space_idx")
        ) {
          // Space is already favorited - remove it
          await db
            .delete(savedSpaces)
            .where(
              and(
                eq(savedSpaces.userId, user.id),
                eq(savedSpaces.spaceId, space[0].id)
              )
            );
          return c.json({ message: "Space unfavorited successfully" });
        }
        throw error;
      }
    }
  )
  .post(
    "/addContent",
    zValidator(
      "json",
      z.object({
        spaceId: z.string(),
        documentId: z.string(),
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const { spaceId, documentId } = body;

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = database(c.env.HYPERDRIVE.connectionString);

      try {
        await db.transaction(async (tx) => {
          // Get space and document, verify space ownership
          const results = (
            await tx
              .select({
                spaceId: spaces.id,
                documentId: documents.id,
                ownerId: spaces.ownerId,
              })
              .from(spaces)
              .innerJoin(
                documents,
                and(eq(spaces.uuid, spaceId), eq(documents.uuid, documentId))
              )
              .limit(1)
          )[0];

          if (!results) {
            return c.json({ error: "Space or document not found" }, 404);
          }

          if (results.ownerId !== user.id) {
            return c.json(
              { error: "Not authorized to modify this space" },
              403
            );
          }

          // Check if mapping already exists to avoid duplicates
          const existing = await tx
            .select()
            .from(contentToSpace)
            .where(
              and(
                eq(contentToSpace.contentId, results.documentId),
                eq(contentToSpace.spaceId, results.spaceId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            return c.json({ error: "Content already exists in space" }, 409);
          }

          await tx
            .insert(contentToSpace)
            .values({
              contentId: results.documentId,
              spaceId: results.spaceId,
            });
        });

        return c.json({ success: true });
      } catch (e) {
        console.error("Failed to add content to space:", e);
        return c.json(
          {
            error: "Failed to add content to space",
            details: e instanceof Error ? e.message : "Unknown error",
          },
          500
        );
      }
    }
  )
  .post(
    "/:spaceId/invite",
    zValidator(
      "json",
      z.object({
        email: z.string().email("Invalid email address"),
        accessType: z.enum(["read", "edit"], {
          errorMap: () => ({
            message: "Access type must be either 'read' or 'edit'",
          }),
        }),
      })
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { spaceId } = c.req.param();
      const { email, accessType } = c.req.valid("json");

      const db = database(c.env.HYPERDRIVE.connectionString);

      // Check if space exists and user has permission to invite
      const space = await db
        .select()
        .from(spaces)
        .where(eq(spaces.uuid, spaceId))
        .limit(1);

      if (space.length === 0) {
        return c.json({ error: "Space not found" }, 404);
      }

      // Only space owner can invite others
      if (space[0].ownerId !== user.id) {
        return c.json({ error: "Only space owner can invite users" }, 403);
      }

      // Check if invite already exists
      const existingInvite = await db
        .select()
        .from(spaceAccess)
        .where(
          and(
            eq(spaceAccess.spaceId, space[0].id),
            eq(spaceAccess.userEmail, email)
          )
        )
        .limit(1);

      if (existingInvite.length > 0) {
        return c.json(
          { error: "User already has access or pending invite" },
          400
        );
      }

      // Create invite
      await db.insert(spaceAccess).values({
        spaceId: space[0].id,
        userEmail: email,
        accessType,
        status: "pending",
      });

      // TODO: send email to the user

      return c.json({ success: true });
    }
  )
  .get(
    "/:spaceId/invitation",
    zValidator("param", z.object({ spaceId: z.string() })),
    async (c) => {
      const { spaceId } = c.req.valid("param");
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = database(c.env.HYPERDRIVE.connectionString);

      const space = await db
        .select()
        .from(spaces)
        .where(eq(spaces.uuid, spaceId))
        .limit(1);

      if (space.length === 0) {
        console.log("Space not found", spaceId);
        return c.json({ error: "Space not found" }, 401);
      }

      // Get pending invitation with access type
      const invitation = await db
        .select()
        .from(spaceAccess)
        .where(
          and(
            eq(spaceAccess.spaceId, space[0].id),
            eq(spaceAccess.userEmail, user.email),
            eq(spaceAccess.status, "pending")
          )
        )
        .limit(1);

      if (invitation.length === 0) {
        return c.json({ error: "No pending invitation found" }, 403);
      }

      return c.json({
        space: space[0],
        accessType: invitation[0].accessType,
      });
    }
  ).post(
    "/invites/:action",
    zValidator(
      "json",
      z.object({
        spaceId: z.string().min(5, "Invalid space ID format"),
      })
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
  
      const db = database(c.env.HYPERDRIVE.connectionString);
  
      const { action } = c.req.param();
      if (action !== "accept" && action !== "reject") {
        return c.json({ error: "Invalid action" }, 400);
      }
  
      const { spaceId } = c.req.valid("json");
      console.log("space ID", spaceId);
  
      // Get space
      const space = await db
        .select()
        .from(spaces)
        .where(eq(spaces.uuid, spaceId))
        .limit(1);
  
      if (space.length === 0) {
        return c.json({ error: "Space not found" }, 404);
      }
  
      // Update invite status
      const updateResult = await db
        .update(spaceAccess)
        .set({ status: action === "accept" ? "accepted" : "rejected" })
        .where(
          and(
            eq(spaceAccess.spaceId, space[0].id),
            eq(spaceAccess.userEmail, user.email),
            eq(spaceAccess.status, "pending")
          )
        );
  
      if (updateResult.length === 0) {
        return c.json({ error: "No pending invite found" }, 404);
      }
  
      return c.json({ success: true });
    }
  );

export default spacesRoute;
