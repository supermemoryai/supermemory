import type { ActorContext } from "./types"

export function spaceStateName(
	actor: Pick<ActorContext, "organizationId" | "userId">,
): string {
	return `space:${JSON.stringify([actor.organizationId, actor.userId])}`
}

export async function resolveContainerTag(
	explicit: string | undefined,
	getActiveContainerTag: () => Promise<string | undefined>,
): Promise<string | undefined> {
	return explicit ?? (await getActiveContainerTag())
}
