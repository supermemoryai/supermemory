import { DurableObject } from "cloudflare:workers"
import { containerTagSchema } from "./container-tag"

const ACTIVE_CONTAINER_TAG_KEY = "activeContainerTag"

export class SpaceState extends DurableObject {
	async getActiveContainerTag(): Promise<string | undefined> {
		return this.ctx.storage.get<string>(ACTIVE_CONTAINER_TAG_KEY)
	}

	async setActiveContainerTag(containerTag: string): Promise<void> {
		const validatedTag = containerTagSchema.parse(containerTag)
		await this.ctx.storage.put(ACTIVE_CONTAINER_TAG_KEY, validatedTag)
	}
}
