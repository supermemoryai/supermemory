import { Hono } from "hono";
import { Env, Variables } from "../types";
import { getDecryptedKV } from "encrypt-workers-kv";
import { getAllNotionPageContents } from "../utils/notion";
import { and, eq, or } from "@supermemory/db";
import { documents } from "@supermemory/db/schema";
import { database } from "@supermemory/db";

const integrations = new Hono<{ Variables: Variables; Bindings: Env }>().get("/notion/import", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Create response first so client gets headers immediately
    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Required CORS headers for SSE
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
    });

    const sendMessage = async (data: Record<string, any>) => {
      // Proper SSE format requires "data: " prefix and double newline
      const formattedData = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(formattedData));
    };

    // Start processing in background
    c.executionCtx.waitUntil(
      (async () => {
        try {
          // Send initial heartbeat
          await sendMessage({ type: "connected" });

          const token = await getDecryptedKV(
            c.env.ENCRYPTED_TOKENS,
            `${user.uuid}-notion`,
            `${c.env.WORKOS_COOKIE_PASSWORD}-${user.uuid}`
          );

          const stringToken = new TextDecoder().decode(token);
          if (!stringToken) {
            await sendMessage({ type: "error", error: "No token found" });
            await writer.close();
            return;
          }

          await sendMessage({ type: "progress", progress: 5 });

          // Fetch pages with progress updates
          const pages = await getAllNotionPageContents(
            stringToken,
            async (progress) => {
              // Map progress from 0-100 to 5-40 range
              const scaledProgress = Math.floor(5 + (progress * 35) / 100);
              await sendMessage({ type: "progress", progress: scaledProgress });
            }
          );

          await sendMessage({ type: "progress", progress: 40 });

          let processed = 0;
          const totalPages = pages.length;

          const db = database(c.env.HYPERDRIVE.connectionString);

          for (const page of pages) {
            // Calculate document hash for duplicate detection
            const encoder = new TextEncoder();
            const data = encoder.encode(page.content);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const documentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

            // Check for duplicates using hash
            const existingDocs = await db
              .select()
              .from(documents)
              .where(
                and(
                  eq(documents.userId, user.id),
                  or(
                    eq(documents.contentHash, documentHash),
                    and(
                      eq(documents.type, "notion"),
                      or(
                        eq(documents.url, page.url),
                        eq(documents.raw, page.content)
                      )
                    )
                  )
                )
              );

            if (existingDocs.length > 0) {
              await sendMessage({ 
                type: "warning", 
                message: `Skipping duplicate page: ${page.title}` 
              });
              processed++;
              continue;
            }

            // Insert into documents table first
            try {
              await db.insert(documents).values({
                uuid: page.id,
                userId: user.id,
                type: "notion",
                url: page.url,
                title: page.title,
                contentHash: documentHash,
                raw: page.content,
              });

              await c.env.CONTENT_WORKFLOW.create({
                params: {
                  userId: user.id,
                  content: page.url,
                  spaces: [],
                  type: "notion",
                  uuid: page.id,
                  url: page.url,
                  prefetched: {
                    contentToVectorize: page.content,
                    contentToSave: page.content,
                    title: page.title,
                    type: "notion",
                  },
                  createdAt: page.createdAt,
                },
                id: `${user.id}-${page.id}-${new Date().getTime()}`,
              });

              processed++;
              const progress = 50 + Math.floor((processed / totalPages) * 50);
              await sendMessage({ type: "progress", progress, page: page.title });

            } catch (error) {
              console.error(`Failed to process page ${page.title}:`, error);
              await sendMessage({
                type: "warning",
                message: `Failed to process page: ${page.title}`,
                error: error instanceof Error ? error.message : "Unknown error"
              });
              processed++;
              continue;
            }
          }

          await sendMessage({ type: "complete", progress: 100 });
          await writer.close();
        } catch (error) {
          console.error("Import error:", error);
          await sendMessage({
            type: "error",
            error: error instanceof Error ? error.message : "Import failed",
          });
          await writer.close();
        }
      })()
    );

    return response;
  });

export default integrations;