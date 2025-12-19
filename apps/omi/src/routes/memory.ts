import type { Context } from "hono"
import type { ErrorResponse, HonoEnv, OMIMemoryPayload } from "../types"
import { createSupermemoryClient } from "../utils"

/**
 * Memory Creation Trigger endpoint handler
 * Receives complete memory object when OMI conversation finishes
 */
export async function handleMemoryCreation(c: Context<HonoEnv>) {
	try {
		const uid = c.req.query("uid")
		const body = await c.req.json()
		console.log("body", body)
		if (!uid) {
			return c.json<ErrorResponse>({ error: "Missing uid parameter" }, 400)
		}

		const memory = await c.req.json<OMIMemoryPayload>()

		// Extract transcript from segments
		if (
			!memory.transcript_segments ||
			memory.transcript_segments.length === 0
		) {
			return c.json<ErrorResponse>(
				{ error: "No transcript segments found" },
				400,
			)
		}

		console.log("memory", memory)

		const transcript = memory.transcript_segments
			.map((seg) => seg.text)
			.join(" ")

		if (!transcript.trim()) {
			return c.json<ErrorResponse>({ error: "Empty transcript" }, 400)
		}

		// Get API key from environment
		const apiKey = c.env.SUPERMEMORY_API_KEY as string | undefined
		const client = createSupermemoryClient(apiKey)

		// Create memory in Supermemory
		const result = await client.memories.add({
			content: transcript,
			containerTag: `omi_user_${uid}`,
			metadata: {
				source: "omi_device",
				memory_id: memory.id,
				created_at: memory.created_at,
				started_at: memory.started_at,
				finished_at: memory.finished_at,
				...(memory.structured?.title && { title: memory.structured.title }),
				...(memory.structured?.category && {
					category: memory.structured.category,
				}),
				...(memory.structured?.emoji && {
					emoji: memory.structured.emoji,
				}),
				discarded: memory.discarded,
			},
			customId: `omi_${memory.id}`,
		})

		return c.json({
			success: true,
			memoryId: result.id,
			status: result.status,
		})
	} catch (error) {
		console.error("Error creating memory:", error)
		return c.json<ErrorResponse>(
			{
				error: "Failed to create memory",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		)
	}
}
