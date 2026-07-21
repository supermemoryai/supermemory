import { DurableObject } from "cloudflare:workers"

const ACTIVE_CONTAINER_TAG_KEY = "activeContainerTag"

export class WorkspaceState extends DurableObject {
	async getActiveContainerTag(): Promise<string | undefined> {
		return this.ctx.storage.get<string>(ACTIVE_CONTAINER_TAG_KEY)
	}

	async setActiveContainerTag(containerTag: string): Promise<void> {
		await this.ctx.storage.put(ACTIVE_CONTAINER_TAG_KEY, containerTag)
	}
}
