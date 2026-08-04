import { DurableObject } from "cloudflare:workers"
import { containerTagSchema } from "./container-tag"

const ACTIVE_CONTAINER_TAG_KEY = "activeContainerTag"
const UPLOAD_SESSION_KEY = "uploadSession"

export interface UploadSession {
	bearerToken: string
	expiresAt: number
}

async function hashUploadToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(token),
	)
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("")
}

export function uploadStateName(uploadId: string): string {
	return `upload:${uploadId}`
}

export class SpaceState extends DurableObject {
	async getActiveContainerTag(): Promise<string | undefined> {
		return this.ctx.storage.get<string>(ACTIVE_CONTAINER_TAG_KEY)
	}

	async setActiveContainerTag(containerTag: string): Promise<void> {
		const validatedTag = containerTagSchema.parse(containerTag)
		await this.ctx.storage.put(ACTIVE_CONTAINER_TAG_KEY, validatedTag)
	}

	async createUploadSession(
		token: string,
		session: UploadSession,
	): Promise<void> {
		await this.ctx.storage.put(UPLOAD_SESSION_KEY, {
			...session,
			tokenHash: await hashUploadToken(token),
		})
		await this.ctx.storage.setAlarm(session.expiresAt)
	}

	async consumeUploadSession(
		token: string,
	): Promise<UploadSession | undefined> {
		const tokenHash = await hashUploadToken(token)
		return this.ctx.storage.transaction(async (transaction) => {
			const session = await transaction.get<
				UploadSession & { tokenHash: string }
			>(UPLOAD_SESSION_KEY)
			if (!session) return undefined
			if (session.expiresAt <= Date.now()) {
				await transaction.delete(UPLOAD_SESSION_KEY)
				return undefined
			}
			if (session.tokenHash !== tokenHash) return undefined

			await transaction.delete(UPLOAD_SESSION_KEY)
			return {
				bearerToken: session.bearerToken,
				expiresAt: session.expiresAt,
			}
		})
	}

	async alarm(): Promise<void> {
		await this.ctx.storage.delete(UPLOAD_SESSION_KEY)
	}
}
