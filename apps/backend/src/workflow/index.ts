import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { Env, WorkflowParams } from "../types";
import { fetchContent } from "../utils/fetchers";
import chunkText from "../utils/chunkers";
import { database, eq, inArray, and, or, sql } from "@supermemory/db";
import {
  ChunkInsert,
  contentToSpace,
  documents,
  spaces,
  chunk,
  Document,
} from "@supermemory/db/schema";
import { embedMany } from "ai";
import { openai } from "../providers";
import { NonRetryableError } from "cloudflare:workflows";
import { createHash } from "crypto";

// Helper function to generate content hash
const generateHash = (content: string) => {
  return createHash("sha256").update(content).digest("hex");
};

interface ChunkUpdate {
  oldChunk?: typeof chunk.$inferSelect;
  newContent?: string;
  orderInDocument: number;
  needsUpdate: boolean;
}

// Helper function to determine which chunks need updates
const analyzeContentChanges = async (
  oldContent: string,
  newContent: string,
  existingChunks: (typeof chunk.$inferSelect)[],
  chunkSize: number = 768
): Promise<ChunkUpdate[]> => {
  // First, chunk the new content with size limits
  const newChunks = chunkText(newContent, chunkSize);
  const updates: ChunkUpdate[] = [];

  // Map existing chunks for quick lookup
  const existingChunksMap = new Map(
    existingChunks.map((c) => [c.orderInDocument, c])
  );

  // Track which old chunks have been processed
  const processedOldChunks = new Set<number>();

  // Process new chunks and match with old ones
  let currentOrder = 0;
  for (const newChunkText of newChunks) {
    const oldChunk = existingChunksMap.get(currentOrder);
    const newChunkHash = generateHash(newChunkText);

    if (oldChunk) {
      processedOldChunks.add(currentOrder);
    }

    // If the new chunk is too large, we need to split it
    if (newChunkText.length > chunkSize) {
      // Re-chunk this specific piece to ensure it fits
      const subChunks = chunkText(newChunkText, chunkSize);

      // Add each sub-chunk as a separate update
      for (let i = 0; i < subChunks.length; i++) {
        const subChunk = subChunks[i];
        const subChunkHash = generateHash(subChunk);

        updates.push({
          oldChunk: i === 0 ? oldChunk : undefined, // Only use the old chunk for the first sub-chunk
          newContent: subChunk,
          orderInDocument: currentOrder + i,
          needsUpdate: true, // Always need to update since we split the chunk
        });
      }

      currentOrder += subChunks.length;
    } else {
      // Normal case - chunk fits within size limit
      updates.push({
        oldChunk,
        newContent: newChunkText,
        orderInDocument: currentOrder,
        needsUpdate: !oldChunk || oldChunk.contentHash !== newChunkHash,
      });
      currentOrder++;
    }
  }

  // Handle any remaining old chunks that weren't processed
  for (const [order, oldChunk] of existingChunksMap) {
    if (!processedOldChunks.has(order)) {
      updates.push({
        oldChunk,
        orderInDocument: order,
        needsUpdate: true, // Mark for deletion since it wasn't used in new content
      });
    }
  }

  // Sort updates by order to ensure proper sequence
  return updates.sort((a, b) => a.orderInDocument - b.orderInDocument);
};

// TODO: handle errors properly here.

export class ContentWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    // Step 0: Check if user has reached memory limit
    await step.do("check memory limit", async () => {
      const existingMemories = await database(
        this.env.HYPERDRIVE.connectionString
      )
        .select()
        .from(documents)
        .where(eq(documents.userId, event.payload.userId));

      if (existingMemories.length >= 2000) {
        throw new NonRetryableError(
          "You have reached the maximum limit of 2000 memories"
        );
      }
    });

    // Step 1: Get and format the content.
    const rawContent =
      event.payload.prefetched ??
      (await step.do(
        "fetch content",
        async () => await fetchContent(event.payload, this.env, step)
      ));

    // check that the rawcontent is not too big
    if (rawContent.contentToVectorize.length > 100000) {
      await database(this.env.HYPERDRIVE.connectionString)
        .delete(documents)
        .where(eq(documents.uuid, event.payload.uuid));
      throw new NonRetryableError("The content is too big (maximum 20 pages)");
    }

    // Generate content hash
    const contentHash = generateHash(rawContent.contentToVectorize);

    // Step 2: Check for existing document by URL
    const existingDocument = await step.do(
      "check existing document",
      async () => {
        if (!event.payload.url) return null;

        console.log(
          "[Workflow] Checking for existing document with URL:",
          event.payload.url
        );
        const docs = await database(this.env.HYPERDRIVE.connectionString)
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.userId, event.payload.userId),
              eq(documents.url, event.payload.url),
              sql`${documents.url} IS NOT NULL`
            )
          )
          .limit(1);

        if (docs[0]) {
          console.log("[Workflow] Found existing document:", {
            id: docs[0].id,
            uuid: docs[0].uuid,
            url: docs[0].url,
          });
        } else {
          console.log("[Workflow] No existing document found for URL");
        }

        return docs[0] || null;
      }
    );

    // Step 3: Update or create document
    const document = await step.do("update or create document", async () => {
      const db = database(this.env.HYPERDRIVE.connectionString);

      if (existingDocument) {
        console.log("[Workflow] Updating existing document:", {
          id: existingDocument.id,
          uuid: existingDocument.uuid,
        });
        // Update existing document
        await db
          .update(documents)
          .set({
            title: rawContent.title,
            description:
              "description" in rawContent
                ? (rawContent.description ?? "")
                : (event.payload.prefetched?.description ?? undefined),
            ogImage:
              "image" in rawContent
                ? (rawContent.image ?? "")
                : (event.payload.prefetched?.ogImage ?? undefined),
            raw: rawContent.contentToVectorize,
            content: rawContent.contentToSave,
            contentHash,
            isSuccessfullyProcessed: false,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, existingDocument.id));
        console.log("[Workflow] Document updated successfully");

        return [existingDocument];
      }

      console.log(
        "[Workflow] Updating document with UUID:",
        event.payload.uuid
      );
      // Create new document
      const updated = await db
        .update(documents)
        .set({
          title: rawContent.title,
          description:
            "description" in rawContent
              ? (rawContent.description ?? "")
              : (event.payload.prefetched?.description ?? undefined),
          ogImage:
            "image" in rawContent
              ? (rawContent.image ?? "")
              : (event.payload.prefetched?.ogImage ?? undefined),
          content: rawContent.contentToSave,
          contentHash,
          isSuccessfullyProcessed: false,
          updatedAt: new Date(),
        })
        .where(eq(documents.uuid, event.payload.uuid))
        .returning();
      console.log("[Workflow] Document update result:", {
        updatedId: updated[0]?.id,
        updatedUuid: updated[0]?.uuid,
      });
      return updated;
    });

    // Step 4: Process content
    console.log("[Workflow] Processing content for document:", {
      id: document[0].id,
      uuid: document[0].uuid,
    });
    const chunked = await step.do("chunk content", async () =>
      chunkText(rawContent.contentToVectorize, 768)
    );

    const model = openai(this.env, this.env.OPEN_AI_API_KEY).embedding(
      "text-embedding-3-large",
      {
        dimensions: 1536,
      }
    );

    // Create embeddings for chunks
    const embeddings = await step.do(
      "create embeddings",
      {
        retries: {
          backoff: "constant",
          delay: "10 seconds",
          limit: 7,
        },
        timeout: "2 minutes",
      },
      async () => {
        const { embeddings }: { embeddings: Array<number>[] } = await embedMany(
          {
            model,
            values: chunked,
          }
        );
        return embeddings;
      }
    );

    // Step 5: Update chunks
    await step.do("update chunks", async () => {
      const db = database(this.env.HYPERDRIVE.connectionString);

      // Delete existing chunks if any
      await db.delete(chunk).where(eq(chunk.documentId, document[0].id));

      // Insert new chunks
      const chunkInsertData: ChunkInsert[] = chunked.map(
        (chunkText, index) => ({
          documentId: document[0].id,
          textContent: chunkText,
          contentHash: generateHash(chunkText),
          orderInDocument: index,
          embeddings: embeddings[index],
        })
      );

      if (chunkInsertData.length > 0) {
        await db.transaction(async (trx) => {
          for (const chunkData of chunkInsertData) {
            await trx
              .insert(chunk)
              .values(chunkData)
              .onConflictDoNothing({ target: chunk.contentHash });
          }
        });
      }
    });

    // Step 6: Mark document as processed
    await step.do("mark document as processed", async () => {
      await database(this.env.HYPERDRIVE.connectionString)
        .update(documents)
        .set({ isSuccessfullyProcessed: true })
        .where(eq(documents.id, document[0].id));
    });

    // Step 7: Add content to spaces if specified
    if (event.payload.spaces) {
      await step.do("add content to spaces", async () => {
        await database(this.env.HYPERDRIVE.connectionString).transaction(
          async (trx) => {
            const spaceIds = await trx
              .select({ id: spaces.id })
              .from(spaces)
              .where(inArray(spaces.uuid, event.payload.spaces ?? []));

            if (spaceIds.length === 0) return;

            await trx.insert(contentToSpace).values(
              spaceIds.map((space) => ({
                contentId: document[0].id,
                spaceId: space.id,
              }))
            );
          }
        );
      });
    }
  }
}
