export interface AgentMessage {
	id: string
	role: "user" | "assistant"
	content: string
	parts: AgentMessagePart[]
	createdAt?: Date
}

export type AgentMessagePart =
	| { type: "text"; text: string }
	| {
			type: "tool-searchMemories"
			state: "input-available" | "input-streaming" | "output-available" | "output-error"
			input?: SearchMemoriesInput
			output?: SearchMemoriesOutput
	  }
	| {
			type: "tool-addMemory"
			state: "input-available" | "input-streaming" | "output-available" | "output-error"
			input?: AddMemoryInput
			output?: AddMemoryOutput
	  }

export interface SearchMemoriesInput {
	query: string
	limit?: number
	containerTags?: string[]
}

export interface SearchMemoriesOutput {
	count: number
	results: MemoryResult[]
}

export interface AddMemoryInput {
	content: string
	title?: string
	url?: string
	containerTags?: string[]
}

export interface AddMemoryOutput {
	id: string
	status: "success" | "error"
	message?: string
}

export interface MemoryResult {
	documentId: string
	title?: string
	content?: string
	url?: string
	score?: number
}

export interface ChatMetadata {
	projectId: string
	model?: string
	chatId?: string
}

export interface ChatRequest {
	messages: Array<{ role: "user" | "assistant"; content: string }>
	metadata: ChatMetadata
}

export interface FollowUpRequest {
	messages: Array<{ role: "user" | "assistant"; content: string }>
}

export interface TitleRequest {
	messages: Array<{ role: "user" | "assistant"; content: string }>
}

export type ClaudeAgentStatus = "idle" | "submitted" | "streaming" | "error"
