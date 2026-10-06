export const TOOL_DESCRIPTIONS = {
	searchMemories:
		"Search the configured namespace for relevant facts, preferences, history, and source context. Use when explicitly asked to search or recall, or when past context could materially improve the response; do not invoke reflexively on every turn. Hybrid results mix learned memories (memory field) and source chunks (chunk field). Only an ID on a result containing a memory field is a memory ID that can be passed to memoryForget; chunk-result IDs cannot be forgotten.",
	addMemory:
		"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
	getProfile:
		"Get the user profile for the configured namespace. The profile contains static memories (permanent facts) and dynamic memories (recent context); each entry has an id usable with memoryForget. Provide a query to also include searchResults.",
	documentList:
		"List stored source documents (conversations, URLs, files, pasted text) in the configured namespace with pagination. Returns document metadata and IDs for documentDelete, not raw document content or memory IDs for memoryForget.",
	documentDelete:
		"Permanently delete a stored source document from the configured namespace. Memories extracted from that source are soft-forgotten so they no longer appear in profile or search; they are not hard-deleted. Use a document ID or caller-defined ID when removing an entire conversation, file, URL, or other source. For safety, deletion is refused while the document is still processing. To forget one learned fact, use memoryForget instead.",
	documentAdd:
		"Store a source document for asynchronous processing and automatic memory extraction. Use when the user gives you raw content to ingest — a pasted text blob, conversation transcript, chat history, notes, URL, article link, or other substantial text — rather than a single atomic fact (use addMemory for one short generalizable sentence). The document is queued immediately; Supermemory post-processes it in the background (chunking, embedding, indexing) and extracts profile memories automatically — you do not need to call addMemory for facts buried inside the document. Good for saving full conversations, long-form notes, knowledge-base articles, meeting transcripts, or any large body of text the user wants remembered beyond this chat turn. Processing may take a moment; extracted memories appear in profile/search after indexing completes.",
	memoryForget:
		"Soft-forget a single extracted memory (a learned fact) in the configured namespace so it no longer appears in profile or search. Does NOT delete source documents. Provide memoryId from getProfile or from a searchMemories result containing a memory field, or provide memoryContent for an exact text match. Chunk-result IDs from searchMemories are not valid. Use when the user retracts or corrects a specific fact. To remove an entire source, use documentDelete instead.",
} as const

export const PARAMETER_DESCRIPTIONS = {
	informationToGet:
		"What to look up in stored context — keywords from the user's message, topic, entity names, or question phrasing.",
	includeFullDocs:
		"Deprecated compatibility input. It is ignored because hybrid search returns learned memories and matching chunks, not full source documents.",
	limit: "Maximum number of results to return",
	searchLimit: "Maximum number of results to return (1-50)",
	memory:
		"The text content of the memory to add. This should be a single sentence or a short paragraph.",
	query: "Optional search query to include relevant search results",
	page: "Page number to fetch, 1-based (default: 1)",
	documentId:
		"Document ID from documentList, or the caller-defined document ID. Permanently deletes the source document and soft-forgets its extracted memories once processing has finished. Not a memory ID.",
	content:
		"Document body to store — plain text, a conversation transcript, a long pasted blob, or a URL to a webpage/PDF/image/video. Content is queued and memories are extracted automatically after background processing; do not split into addMemory calls.",
	title: "Optional title for the document",
	description: "Optional description for the document",
	memoryId:
		"Memory ID from getProfile or a searchMemories result containing a memory field. Soft-forgets one learned fact; chunk-result and document IDs are not valid.",
	memoryContent:
		"Exact text of the memory to forget (alternative to memoryId). Must match precisely; if unsure, call getProfile and use a memory ID.",
} as const
