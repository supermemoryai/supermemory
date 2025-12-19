// OMI-specific type definitions

export interface OMITranscriptSegment {
	text: string
	speaker: string
	speakerId: number
	is_user: boolean
	start: number
	end: number
}

export interface OMIStructured {
	title?: string
	overview?: string
	emoji?: string
	category?: string
	action_items?: Array<{
		description: string
		completed: boolean
	}>
	events?: unknown[]
}

export interface OMIMemoryPayload {
	id: string
	created_at: string
	started_at: string
	finished_at: string
	transcript_segments: OMITranscriptSegment[]
	structured?: OMIStructured
	apps_response?: unknown[]
	discarded: boolean
}
