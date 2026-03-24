/**
 * Integration tests for the MiniMax + Supermemory integration.
 *
 * These tests verify that MiniMax models work correctly through the
 * OpenAI-compatible API when wrapped with Supermemory memory middleware.
 *
 * Requires:
 * - MINIMAX_API_KEY: MiniMax API key
 * - SUPERMEMORY_API_KEY: Supermemory API key
 */

import { describe, it, expect, vi } from "vitest"
import OpenAI from "openai"
import {
	withSupermemory,
	MINIMAX_BASE_URL,
	clampTemperature,
} from "../../src/minimax"
import "dotenv/config"

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ""
const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY || ""

const shouldRunIntegration = !!MINIMAX_API_KEY && !!SUPERMEMORY_API_KEY

describe.skipIf(!shouldRunIntegration)(
	"Integration: MiniMax + Supermemory",
	() => {
		const createMiniMaxClient = () =>
			new OpenAI({
				apiKey: MINIMAX_API_KEY,
				baseURL: MINIMAX_BASE_URL,
			})

		it(
			"should complete a basic chat via MiniMax API",
			async () => {
				const client = createMiniMaxClient()

				const response = await client.chat.completions.create({
					model: "MiniMax-M2.7",
					messages: [
						{ role: "user", content: 'Say exactly "hello minimax"' },
					],
					max_tokens: 20,
					temperature: clampTemperature(0.7),
				})

				expect(response.choices).toBeDefined()
				expect(response.choices.length).toBeGreaterThan(0)
				expect(response.choices[0]?.message?.content).toBeTruthy()
			},
			30000,
		)

		it(
			"should work with MiniMax-M2.7-highspeed model",
			async () => {
				const client = createMiniMaxClient()

				const response = await client.chat.completions.create({
					model: "MiniMax-M2.7-highspeed",
					messages: [{ role: "user", content: "What is 2+2?" }],
					max_tokens: 20,
					temperature: clampTemperature(0.5),
				})

				expect(response.choices).toBeDefined()
				expect(response.choices[0]?.message?.content).toBeTruthy()
			},
			30000,
		)

		it(
			"should work with supermemory middleware wrapping MiniMax client",
			async () => {
				const client = createMiniMaxClient()
				const wrapped = withSupermemory(
					client,
					"minimax-integration-test",
					{
						mode: "profile",
					},
				)

				// The wrapped client should still have the chat API
				expect(wrapped.chat.completions.create).toBeDefined()
			},
			10000,
		)
	},
)
