export interface ChatRequest {
	message: string
	userId: string
}

export interface SearchResult {
	memory?: string
	chunk?: string
	content?: string | null
	[id: string]: unknown
}

export interface ChatResponse {
	message: string
	memories: number
	context: string
	results?: SearchResult[]
}

export interface ErrorResponse {
	error: string
	details?: string
}
