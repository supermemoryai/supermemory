export interface CloudflareBindings {
	SUPERMEMORY_API_KEY?: string
}

export type HonoEnv = {
	Bindings: CloudflareBindings
}
