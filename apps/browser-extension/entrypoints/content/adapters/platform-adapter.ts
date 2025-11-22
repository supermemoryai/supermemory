export interface PlatformAdapter {
	/**
	 * Unique identifier for the adapter. Useful for debugging and telemetry.
	 */
	readonly id: string

	/**
	 * Determines whether this adapter should run for the current page.
	 */
	matches(): boolean

	/**
	 * Performs any one-time setup. Implementations should be idempotent.
	 */
	init(): void
}

