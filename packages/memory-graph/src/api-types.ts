// Standalone TypeScript types for Memory Graph
// These mirror the API response types from @repo/validation/api

export interface MemoryEntry {
	id: string;
	customId?: string | null;
	documentId: string;
	content: string | null;
	summary?: string | null;
	title?: string | null;
	url?: string | null;
	type?: string | null;
	metadata?: Record<string, string | number | boolean> | null;
	embedding?: number[] | null;
	embeddingModel?: string | null;
	tokenCount?: number | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	// Fields from join relationship
	sourceAddedAt?: Date | null;
	sourceRelevanceScore?: number | null;
	sourceMetadata?: Record<string, unknown> | null;
	spaceContainerTag?: string | null;
	// Version chain fields
	updatesMemoryId?: string | null;
	nextVersionId?: string | null;
	relation?: "updates" | "extends" | "derives" | null;
	// Memory status fields
	isForgotten?: boolean;
	forgetAfter?: Date | string | null;
	isLatest?: boolean;
	// Space/container fields
	spaceId?: string | null;
	// Legacy fields
	memory?: string | null;
	memoryRelations?: Array<{
		relationType: "updates" | "extends" | "derives";
		targetMemoryId: string;
	}> | null;
	parentMemoryId?: string | null;
}

export interface DocumentWithMemories {
	id: string;
	customId?: string | null;
	contentHash: string | null;
	orgId: string;
	userId: string;
	connectionId?: string | null;
	title?: string | null;
	content?: string | null;
	summary?: string | null;
	url?: string | null;
	source?: string | null;
	type?: string | null;
	status: "pending" | "processing" | "done" | "failed";
	metadata?: Record<string, string | number | boolean> | null;
	processingMetadata?: Record<string, unknown> | null;
	raw?: string | null;
	tokenCount?: number | null;
	wordCount?: number | null;
	chunkCount?: number | null;
	averageChunkSize?: number | null;
	summaryEmbedding?: number[] | null;
	summaryEmbeddingModel?: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	memoryEntries: MemoryEntry[];
}

export interface DocumentsResponse {
	documents: DocumentWithMemories[];
	pagination: {
		currentPage: number;
		limit: number;
		totalItems: number;
		totalPages: number;
	};
}
