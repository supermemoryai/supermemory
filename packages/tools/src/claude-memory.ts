import type { Supermemory } from "supermemory"
import {
	createToolsClient,
	getNamespace,
	isNotFoundError,
} from "./tools-shared"
import type { SupermemoryToolsConfig } from "./types"

export type ClaudeMemoryConfig = SupermemoryToolsConfig

export const CLAUDE_MEMORY_SOURCE = "claude-memory"

interface MemoryCommandFields {
	// view specific
	view_range?: [number, number]
	// create specific
	file_text?: string
	// str_replace specific
	old_str?: string
	new_str?: string
	// insert specific
	insert_line?: number
	insert_text?: string
	// rename specific: Claude sends old_path/new_path (path is accepted too
	// for backwards compatibility with earlier callers)
	old_path?: string
	new_path?: string
}

export type MemoryCommand =
	| (MemoryCommandFields & {
			command: "view" | "create" | "str_replace" | "insert" | "delete"
			path: string
	  })
	| (MemoryCommandFields & { command: "rename"; path?: string })

export interface MemoryResponse {
	success: boolean
	content?: string
	error?: string
}

export interface MemoryToolResult {
	type: "tool_result"
	tool_use_id: string
	content: string
	is_error: boolean
}

type ClaudeFileMetadata = Record<string, string | number | boolean | string[]>

interface ClaudeFileDocument {
	documentId: string
	content: string
	metadata: ClaudeFileMetadata
}

/** Maps Claude's memory tool commands to Supermemory documents in one namespace. */
export class ClaudeMemoryTool {
	private client: Supermemory
	private namespace: string

	/** Reversible encoding; the `cm_` prefix keeps it disjoint from legacy IDs, which always start with `memories`: /memories/a_b.txt -> cm_memories_s_a__b_d_txt */
	private normalizePathToId(path: string): string {
		return `cm_${path
			.replace(/^\//, "")
			.replace(/_/g, "__")
			.replace(/\//g, "_s_")
			.replace(/\./g, "_d_")}`
	}

	/** Pre-3.1.2 IDs, where / and . both became _ */
	private legacyNormalizePathToId(path: string): string {
		return path.replace(/^\//, "").replace(/\//g, "_").replace(/\./g, "_")
	}

	constructor(apiKey: string, config?: ClaudeMemoryConfig) {
		this.client = createToolsClient(apiKey, config)
		this.namespace = getNamespace(config)
	}

	/**
	 * Main method to handle all Claude memory tool commands
	 */
	async handleCommand(command: MemoryCommand): Promise<MemoryResponse> {
		try {
			// rename is the one command that doesn't use `path`: Claude sends
			// old_path/new_path. Fall back to `path` so older callers keep working.
			const path =
				command.command === "rename"
					? (command.old_path ?? command.path)
					: command.path

			// Validate path security
			if (path === undefined || !this.isValidPath(path)) {
				return {
					success: false,
					error: `Invalid path: ${path}. All paths must start with /memories/`,
				}
			}

			switch (command.command) {
				case "view":
					return await this.view(path, command.view_range)
				case "create":
					if (!command.file_text) {
						return {
							success: false,
							error: "file_text is required for create command",
						}
					}
					return await this.create(path, command.file_text)
				case "str_replace":
					// new_str may be "" (deleting text) but must be present.
					if (!command.old_str || command.new_str === undefined) {
						return {
							success: false,
							error: "old_str and new_str are required for str_replace command",
						}
					}
					return await this.strReplace(path, command.old_str, command.new_str)
				case "insert":
					// insert_text may be "" (inserting a blank line).
					if (
						command.insert_line === undefined ||
						command.insert_text === undefined
					) {
						return {
							success: false,
							error:
								"insert_line and insert_text are required for insert command",
						}
					}
					return await this.insert(
						path,
						command.insert_line,
						command.insert_text,
					)
				case "delete":
					return await this.delete(path)
				case "rename":
					if (!command.new_path) {
						return {
							success: false,
							error: "new_path is required for rename command",
						}
					}
					return await this.rename(path, command.new_path)
				default:
					return {
						success: false,
						error: `Unknown command: ${(command as { command: string }).command}`,
					}
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Handle command and return properly formatted tool result
	 */
	async handleCommandForToolResult(
		command: MemoryCommand,
		toolUseId: string,
	): Promise<MemoryToolResult> {
		const response = await this.handleCommand(command)

		return {
			type: "tool_result",
			tool_use_id: toolUseId,
			content: response.success
				? response.content || "Operation completed successfully"
				: `Error: ${response.error}`,
			is_error: !response.success,
		}
	}

	/**
	 * View command: List directory contents or read file with optional line range
	 */
	private async view(
		path: string,
		viewRange?: [number, number],
	): Promise<MemoryResponse> {
		// If path ends with / or is exactly /memories, it's a directory listing request
		if (path.endsWith("/") || path === "/memories") {
			// Normalize path to end with /
			const dirPath = path.endsWith("/") ? path : `${path}/`
			return await this.listDirectory(dirPath)
		}

		// Otherwise, read the specific file
		return await this.readFile(path, viewRange)
	}

	/**
	 * List directory contents
	 */
	private async listDirectory(dirPath: string): Promise<MemoryResponse> {
		try {
			// Walk every page so files cannot disappear from a listing.
			const filePaths: string[] = []
			let page = 1

			while (true) {
				const response = await this.client.list(this.namespace, "documents", {
					filter: {
						operator: "and",
						operands: [
							{ field: "source", operator: "eq", value: CLAUDE_MEMORY_SOURCE },
							{ field: "claude_memory_type", operator: "eq", value: "file" },
							{ field: "file_path", operator: "contains", value: dirPath },
						],
					},
					limit: 100,
					page,
				})

				for (const document of response.documents) {
					const filePath = this.getDocumentFilePath(document)
					if (filePath?.startsWith(dirPath)) filePaths.push(filePath)
				}

				if (page >= response.pagination.totalPages) break
				page += 1
			}

			const files: string[] = []
			const dirs = new Set<string>()

			for (const filePath of filePaths) {
				const relativePath = filePath.substring(dirPath.length)
				if (!relativePath) continue

				const slashIndex = relativePath.indexOf("/")
				if (slashIndex > 0) {
					dirs.add(`${relativePath.substring(0, slashIndex)}/`)
				} else {
					files.push(relativePath)
				}
			}

			const entries = [...Array.from(dirs).sort(), ...files.sort()]

			if (entries.length === 0) {
				return {
					success: true,
					content: `Directory: ${dirPath}\n(empty)`,
				}
			}

			return {
				success: true,
				content: `Directory: ${dirPath}\n${entries.map((entry) => `- ${entry}`).join("\n")}`,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to list directory: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	/**
	 * Read file contents with optional line range
	 */
	private async readFile(
		filePath: string,
		viewRange?: [number, number],
	): Promise<MemoryResponse> {
		try {
			// Resolve the exact document inside the configured scope so reads and
			// mutations use the complete stored file, not one ranked search chunk.
			const readResult = await this.getFileDocument(filePath)
			if (!readResult.success || !readResult.document) {
				return {
					success: false,
					error: readResult.error || `File not found: ${filePath}`,
				}
			}

			const document = readResult.document

			let content = document.content

			// Apply line range if specified
			if (viewRange) {
				const lines = content.split("\n")
				const [startLine, endLine] = viewRange
				// `endLine === -1` is the documented sentinel for "read to the end
				// of the file" (same convention as Anthropic's text-editor tool).
				// Passing it straight to Array.slice would be interpreted as a
				// from-the-end index and silently drop the final line, so map any
				// negative end to the array length.
				const sliceEnd = endLine < 0 ? lines.length : endLine
				const selectedLines = lines.slice(startLine - 1, sliceEnd)

				// Format with line numbers
				const numberedLines = selectedLines.map(
					(line: string, index: number) => {
						const lineNum = startLine + index
						return `${lineNum.toString().padStart(4)}\t${line}`
					},
				)

				content = numberedLines.join("\n")
			} else {
				// Format all lines with line numbers
				const lines = content.split("\n")
				const numberedLines = lines.map((line, index) => {
					const lineNum = index + 1
					return `${lineNum.toString().padStart(4)}\t${line}`
				})
				content = numberedLines.join("\n")
			}

			return {
				success: true,
				content,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	/**
	 * Create command: Create or overwrite a memory file
	 */
	private async create(
		filePath: string,
		fileText: string,
	): Promise<MemoryResponse> {
		try {
			const target = await this.resolveWriteId(filePath)
			if ("error" in target) return { success: false, error: target.error }
			await this.writeFile(target.id, fileText, {
				source: CLAUDE_MEMORY_SOURCE,
				claude_memory_type: "file",
				file_path: filePath,
				line_count: fileText.split("\n").length,
				created_by: "claude_memory_tool",
				last_modified: new Date().toISOString(),
			})

			return {
				success: true,
				content: `File created: ${filePath}`,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to create file: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	/**
	 * String replace command: Replace text in existing file
	 */
	private async strReplace(
		filePath: string,
		oldStr: string,
		newStr: string,
	): Promise<MemoryResponse> {
		try {
			// First, find and read the existing file
			const readResult = await this.getFileDocument(filePath)
			if (!readResult.success || !readResult.document) {
				return {
					success: false,
					error: readResult.error || "File not found",
				}
			}

			const originalContent = readResult.document.content

			// Check if old_str exists in the content
			if (!originalContent.includes(oldStr)) {
				return {
					success: false,
					error: `String not found in file: "${oldStr}"`,
				}
			}

			// old_str must be unique, like Anthropic's memory tool: replacing
			// only the first of several matches would silently edit the wrong spot.
			const matchingLines: number[] = []
			for (
				let index = originalContent.indexOf(oldStr);
				index !== -1;
				index = originalContent.indexOf(oldStr, index + 1)
			) {
				matchingLines.push(originalContent.slice(0, index).split("\n").length)
			}
			if (matchingLines.length > 1) {
				return {
					success: false,
					error: `No replacement was performed. Multiple occurrences of old_str "${oldStr}" in lines: ${matchingLines.join(", ")}. Please ensure it is unique`,
				}
			}

			// Replace the string. The function replacer keeps `$` sequences
			// in the replacement literal — a bare string here would expand
			// patterns like $&, $', and $` and silently corrupt the file.
			const newContent = originalContent.replace(oldStr, () => newStr)

			await this.writeFile(readResult.document.documentId, newContent, {
				...readResult.document.metadata,
				line_count: newContent.split("\n").length,
				last_modified: new Date().toISOString(),
			})

			return {
				success: true,
				content: `String replaced in file: ${filePath}`,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to replace string: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	/**
	 * Insert command: Insert text at specific line
	 */
	private async insert(
		filePath: string,
		insertLine: number,
		insertText: string,
	): Promise<MemoryResponse> {
		try {
			// First, find and read the existing file
			const readResult = await this.getFileDocument(filePath)
			if (!readResult.success || !readResult.document) {
				return {
					success: false,
					error: readResult.error || "File not found",
				}
			}

			const originalContent = readResult.document.content
			const lines = originalContent.split("\n")

			// insert_line is the line the text goes after: 0 means the beginning
			// of the file and lines.length appends at the end.
			if (insertLine < 0 || insertLine > lines.length) {
				return {
					success: false,
					error: `Invalid insert_line parameter: ${insertLine}. It should be within the range of lines of the file: [0, ${lines.length}]`,
				}
			}

			lines.splice(insertLine, 0, insertText)
			const newContent = lines.join("\n")

			await this.writeFile(readResult.document.documentId, newContent, {
				...readResult.document.metadata,
				line_count: newContent.split("\n").length,
				last_modified: new Date().toISOString(),
			})

			return {
				success: true,
				content: `Text inserted after line ${insertLine} in file: ${filePath}`,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to insert text: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	/**
	 * Delete command: Delete memory file
	 */
	private async delete(filePath: string): Promise<MemoryResponse> {
		try {
			// Find the document first
			const readResult = await this.getFileDocument(filePath)
			const documentId =
				readResult.document?.documentId ?? readResult.documentId
			if (!documentId) {
				return {
					success: false,
					error: readResult.error || "File not found",
				}
			}

			await this.deleteFile(documentId)

			return {
				success: true,
				content: `File deleted: ${filePath}`,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	/**
	 * Rename command: Move/rename memory file
	 */
	private async rename(
		oldPath: string,
		newPath: string,
	): Promise<MemoryResponse> {
		try {
			// Validate new path
			if (!this.isValidPath(newPath)) {
				return {
					success: false,
					error: `Invalid new path: ${newPath}. All paths must start with /memories/`,
				}
			}

			// Get the existing document
			const readResult = await this.getFileDocument(oldPath)
			if (!readResult.success || !readResult.document) {
				return {
					success: false,
					error: readResult.error || "File not found",
				}
			}

			// Overwrite the destination's existing document (possibly a legacy ID) so no stale copy survives.
			const target = await this.resolveWriteId(newPath)
			if ("error" in target) return { success: false, error: target.error }

			await this.writeFile(target.id, readResult.document.content, {
				...readResult.document.metadata,
				file_path: newPath,
				last_modified: new Date().toISOString(),
			})

			if (readResult.document.documentId !== target.id) {
				await this.deleteFile(readResult.document.documentId)
			}

			return {
				success: true,
				content: `File renamed from ${oldPath} to ${newPath}`,
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to rename file: ${error instanceof Error ? error.message : "Unknown error"}`,
			}
		}
	}

	// v5 `add` with an existing id appends; `update` replaces, so writes try update first.
	private async writeFile(
		id: string,
		content: string,
		metadata: ClaudeFileMetadata,
	): Promise<void> {
		try {
			await this.client.documents.update(this.namespace, id, {
				content,
				metadata,
			})
		} catch (error) {
			if (!isNotFoundError(error)) throw error
			await this.client.add(this.namespace, { content, id, metadata })
		}
	}

	private async deleteFile(id: string): Promise<void> {
		const response = await this.client.documents.delete(this.namespace, {
			ids: [id],
		})
		if (response.count === 1) return
		const detail = response.errors?.find((error) => error.id === id)?.error
		throw new Error(
			detail
				? `Failed to delete document ${id}: ${detail}`
				: `Failed to delete document ${id}: expected one deletion, received ${response.count}`,
		)
	}

	private async getFileDocument(filePath: string): Promise<{
		success: boolean
		document?: ClaudeFileDocument
		/** Set when the file exists, even if its content is still processing. */
		documentId?: string
		/** Only true for a confirmed 404, never for a failed lookup. */
		notFound?: boolean
		/** The file's own ID is held by a document that isn't this file. */
		occupied?: boolean
		error?: string
	}> {
		try {
			// Files written before 3.1.2 still live under the legacy ID.
			const ids = [
				this.normalizePathToId(filePath),
				this.legacyNormalizePathToId(filePath),
			]
			let occupied = false
			for (const id of ids) {
				let document: Awaited<ReturnType<Supermemory["documents"]["get"]>>
				try {
					document = await this.client.documents.get(this.namespace, id)
				} catch (error) {
					if (isNotFoundError(error)) continue
					throw error
				}

				// Different paths can share a legacy ID; only the exact file counts.
				if (
					document.metadata?.source !== CLAUDE_MEMORY_SOURCE ||
					this.getDocumentFilePath(document) !== filePath
				) {
					if (id === ids[0]) occupied = true
					continue
				}
				if (typeof document.content !== "string") {
					return {
						success: false,
						documentId: id,
						error: `File content unavailable: ${filePath}`,
					}
				}

				return {
					success: true,
					document: {
						documentId: id,
						content: document.content,
						metadata: document.metadata as ClaudeFileMetadata,
					},
				}
			}

			return {
				success: false,
				notFound: true,
				occupied,
				error: `File not found: ${filePath}`,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/** The ID a write to filePath must use; errors rather than guessing when the lookup fails. */
	private async resolveWriteId(
		filePath: string,
	): Promise<{ id: string } | { error: string }> {
		const existing = await this.getFileDocument(filePath)
		const existingId = existing.document?.documentId ?? existing.documentId
		if (existingId) return { id: existingId }
		if (!existing.notFound) {
			return { error: existing.error ?? `Failed to look up ${filePath}` }
		}
		if (existing.occupied) {
			return { error: `Another document already uses the ID for ${filePath}` }
		}
		return { id: this.normalizePathToId(filePath) }
	}

	private getDocumentFilePath(document: {
		metadata: unknown
	}): string | undefined {
		const metadata = document.metadata
		if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
			return undefined
		}
		const metadataRecord = metadata as Record<string, unknown>

		return typeof metadataRecord.file_path === "string"
			? metadataRecord.file_path
			: undefined
	}

	/**
	 * Validate that path starts with /memories for security
	 */
	private isValidPath(path: string): boolean {
		if (!(path.startsWith("/memories/") || path === "/memories")) {
			return false
		}
		if (path.includes("..\\")) {
			return false
		}
		// Reject any parent-directory segment, including trailing "/.." which
		// the previous "../" substring check missed (e.g. "/memories/..").
		return !path.split("/").some((segment) => segment === "..")
	}
}

/**
 * Create a Claude memory tool instance
 */
export function createClaudeMemoryTool(
	apiKey: string,
	config?: ClaudeMemoryConfig,
) {
	return new ClaudeMemoryTool(apiKey, config)
}
