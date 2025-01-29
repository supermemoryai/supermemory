import { Hono } from "hono";
import { Variables, Env } from "../types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  documents,
  spaces,
  spaceAccess,
  contentToSpace,
} from "@supermemory/db/schema";
import { and, database, desc, eq, or, sql } from "@supermemory/db";

const memories = new Hono<{ Variables: Variables; Bindings: Env }>()
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        start: z.string().default("0").transform(Number),
        count: z.string().default("10").transform(Number),
        spaceId: z.string().optional(),
      })
    ),
    async (c) => {
      const { start, count, spaceId } = c.req.valid("query");
      const user = c.get("user");
      const db = database(c.env.HYPERDRIVE.connectionString);

      console.log("Fetching memories with spaceId", spaceId);
      console.log(c.req.url);
      // If spaceId provided, verify access
      if (spaceId) {
        console.log("SpaceID provided", spaceId);
        const space = await db
          .select()
          .from(spaces)
          .where(eq(spaces.uuid, spaceId.split("---")[0]))
          .limit(1);

        if (!space[0]) {
          return c.json({ error: "Space not found" }, 404);
        }

        // Check access - allow if public, user owns the space, or has access through spaceAccess
        if (!space[0].isPublic && !user) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (!space[0].isPublic && space[0].ownerId !== user?.id) {
          const access = await db
            .select()
            .from(spaceAccess)
            .where(
              and(
                eq(spaceAccess.spaceId, space[0].id),
                eq(spaceAccess.userEmail, user?.email ?? ""),
                eq(spaceAccess.status, "accepted")
              )
            )
            .limit(1);

          if (access.length === 0) {
            console.log("Unauthorized access to", c.req.url);
            return c.json({ error: "Unauthorized" }, 401);
          }
        }

        // Get documents for space
        const [items, totalResult] = await Promise.all([
          db
            .select({
              documents,
            })
            .from(documents)
            .innerJoin(
              contentToSpace,
              eq(documents.id, contentToSpace.contentId)
            )
            .where(eq(contentToSpace.spaceId, space[0].id))
            .orderBy(desc(documents.createdAt))
            .limit(count)
            .offset(start),
          db
            .select({
              total: sql<number>`count(*)`.as("total"),
            })
            .from(documents)
            .innerJoin(
              contentToSpace,
              eq(documents.id, contentToSpace.contentId)
            )
            .where(eq(contentToSpace.spaceId, space[0].id)),
        ]);

        const total = totalResult[0]?.total ?? 0;

        return c.json({
          items: items.map((item) => ({
            ...item.documents,
            id: item.documents.uuid,
          })),
          total,
        });
      }

      // Regular user memories endpoint
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Set cache control headers for 5 minutes
      c.header("Cache-Control", "private, max-age=300");
      c.header("Vary", "Cookie"); // Vary on Cookie since response depends on user

      // Generate ETag based on user ID, start, count
      const etag = `"${user.id}-${start}-${count}"`;
      c.header("ETag", etag);

      // Check if client has matching ETag
      const ifNoneMatch = c.req.header("If-None-Match");
      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304 });
      }

      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(documents)
          .where(eq(documents.userId, user.id))
          .orderBy(desc(documents.createdAt))
          .limit(count)
          .offset(start),
        db
          .select({
            total: sql<number>`count(*)`.as("total"),
          })
          .from(documents)
          .where(eq(documents.userId, user.id)),
      ]);

      return c.json({
        items: items.map((item) => ({
          ...item,
          id: item.uuid,
        })),
        total,
      });
    }
  )
  .get("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const memory = await database(c.env.HYPERDRIVE.connectionString)
      .select()
      .from(documents)
      .where(and(eq(documents.uuid, id), eq(documents.userId, user.id)))
      .limit(1);

    return c.json(memory[0]);
  })
  .delete(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = database(c.env.HYPERDRIVE.connectionString);

      let documentIdNum

      try {
        documentIdNum = Number(id);
      } catch (e) {
        documentIdNum = null;
      }

      const doc = await db
        .select()
        .from(documents)
        .where(
          and(
            documentIdNum ? or(eq(documents.uuid, id), eq(documents.id, documentIdNum)) : eq(documents.uuid, id),
            eq(documents.userId, user.id)
          )
        )
        .limit(1);

      if (!doc[0]) {
        return c.json({ error: "Document not found" }, 404);
      }

      const [document, contentToSpacei] = await Promise.all([
        db
          .delete(documents)
          .where(and(eq(documents.uuid, id), eq(documents.userId, user.id))),
        db
          .delete(contentToSpace)
          .where(eq(contentToSpace.contentId, doc[0].id)),
      ]);

      return c.json({ success: true });
    }
  );

export default memories;
