export interface SupermemoryToolsConfig {
	/** Custom base URL for the supermemory API */
	baseUrl?: string
	/** Namespace every tool reads and writes. Defaults to `sm_project_default`. */
	namespace?: string
	/** When true, all schema properties are required (OpenAI strict mode). */
	strict?: boolean
}
