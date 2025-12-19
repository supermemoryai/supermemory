import Supermemory from "supermemory"

/**
 * Creates a Supermemory client instance with the provided API key
 * @param apiKey - The Supermemory API key
 * @returns Supermemory client instance
 * @throws Error if API key is not provided
 */
export function createSupermemoryClient(
	apiKey: string | undefined,
): Supermemory {
	if (!apiKey) {
		throw new Error("SUPERMEMORY_API_KEY not configured")
	}
	return new Supermemory({ apiKey })
}
