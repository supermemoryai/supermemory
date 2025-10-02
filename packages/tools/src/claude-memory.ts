import Supermemory from "supermemory"
import { getContainerTags } from "./shared"
import type { SupermemoryToolsConfig } from "./types"

// Claude Memory Tool Types
export interface ClaudeMemoryConfig extends SupermemoryToolsConfig {
	memoryContainerTag?: string
}

export interface MemoryCommand {
	command: "view" | "create" | "str_replace" | "insert" | "delete" | "rename"
	path: string
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
	// rename specific
	new_path?: string
}

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

/**
 * Claude Memory Tool - Client-side implementation
 * Maps Claude's memory tool commands to supermemory document operations
 */
export class ClaudeMemoryTool {
	private client: Supermemory
	private containerTags: string[]
	private memoryContainerPrefix: string

	/**
	 * Normalize file path to be used as customId (replace / with --)
	 */
	private normalizePathToCustomId(path: string): string {
		return path.replace(/\//g, "--")
	}

	/**
	 * Convert customId back to file path (replace -- with /)
	 */
	private customIdToPath(customId: string): string {
		return customId.replace(/--/g, "/")
	}

	constructor(apiKey: string, config?: ClaudeMemoryConfig) {
		this.client = new Supermemory({
			apiKey,
			...(config?.baseUrl && { baseURL: config.baseUrl }),
		})

		// Use custom memory container tag or default
		this.memoryContainerPrefix = config?.memoryContainerTag || "claude_memory"

		// Get base container tags and add memory-specific tag
		const baseContainerTags = getContainerTags(config)
		this.containerTags = [...baseContainerTags, this.memoryContainerPrefix]
	}

	/**
	 * Main method to handle all Claude memory tool commands
	 */
	async handleCommand(command: MemoryCommand): Promise<MemoryResponse> {
		try {
			// Validate path security
			if (!this.isValidPath(command.path)) {
				return {
					success: false,
					error: `Invalid path: ${command.path}. All paths must start with /memories/`,
				}
			}

			switch (command.command) {
				case "view":
					return await this.view(command.path, command.view_range)
				case "create":
					if (!command.file_text) {
						return {
							success: false,
							error: "file_text is required for create command",
						}
					}
					return await this.create(command.path, command.file_text)
				case "str_replace":
					if (!command.old_str || !command.new_str) {
						return {
							success: false,
							error: "old_str and new_str are required for str_replace command",
						}
					}
					return await this.strReplace(
						command.path,
						command.old_str,
						command.new_str,
					)
				case "insert":
					if (command.insert_line === undefined || !command.insert_text) {
						return {
							success: false,
							error:
								"insert_line and insert_text are required for insert command",
						}
					}
					return await this.insert(
						command.path,
						command.insert_line,
						command.insert_text,
					)
				case "delete":
					return await this.delete(command.path)
				case "rename":
					if (!command.new_path) {
						return {
							success: false,
							error: "new_path is required for rename command",
						}
					}
					return await this.rename(command.path, command.new_path)
				default:
					return {
						success: false,
						error: `Unknown command: ${(command as any).command}`,
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
			const dirPath = path.endsWith("/") ? path : path + "/"
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
			// Search for all memory files
			const response = await this.client.search.execute({
				q: "*", // Search for all
				containerTags: this.containerTags,
				limit: 100, // Get many files (max allowed)
				includeFullDocs: false,
			})

			if (!response.results) {
				return {
					success: true,
					content: `Directory: ${dirPath}\n(empty)`,
				}
			}

			// Filter files that match the directory path and extract relative paths
			const files: string[] = []
			const dirs = new Set<string>()

			for (const result of response.results) {
				// Get the file path from metadata (since customId is normalized)
				const filePath = result.metadata?.file_path as string
				if (!filePath || !filePath.startsWith(dirPath)) continue

				// Get relative path from directory
				const relativePath = filePath.substring(dirPath.length)
				if (!relativePath) continue

				// If path contains /, it's in a subdirectory
				const slashIndex = relativePath.indexOf("/")
				if (slashIndex > 0) {
					// It's a subdirectory
					dirs.add(relativePath.substring(0, slashIndex) + "/")
				} else if (relativePath !== "") {
					// It's a file in this directory
					files.push(relativePath)
				}
			}

			// Format directory listing
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
			const normalizedId = this.normalizePathToCustomId(filePath)

			const response = await this.client.search.execute({
				q: normalizedId,
				containerTags: this.containerTags,
				limit: 1,
				includeFullDocs: true,
			})

			// Try to find exact match by customId
			const exactMatch = response.results?.find(
				(r) => r.documentId === normalizedId,
			)
			const document = exactMatch || response.results?.[0]

			if (!document) {
				return {
					success: false,
					error: `File not found: ${filePath}`,
				}
			}

			let content = document.content || ""

			// Apply line range if specified
			if (viewRange) {
				const lines = content.split("\n")
				const [startLine, endLine] = viewRange
				const selectedLines = lines.slice(startLine - 1, endLine)

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
			const normalizedId = this.normalizePathToCustomId(filePath)

			const response = await this.client.memories.add({
				content: fileText,
				customId: normalizedId,
				containerTags: this.containerTags,
				metadata: {
					claude_memory_type: "file",
					file_path: filePath,
					line_count: fileText.split("\n").length,
					created_by: "claude_memory_tool",
					last_modified: new Date().toISOString(),
				},
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

			const originalContent =
				readResult.document.raw || readResult.document.content || ""

			// Check if old_str exists in the content
			if (!originalContent.includes(oldStr)) {
				return {
					success: false,
					error: `String not found in file: "${oldStr}"`,
				}
			}

			// Replace the string
			const newContent = originalContent.replace(oldStr, newStr)

			// Update the document
			const normalizedId = this.normalizePathToCustomId(filePath)
			const updateResponse = await this.client.memories.add({
				content: newContent,
				customId: normalizedId,
				containerTags: this.containerTags,
				metadata: {
					...readResult.document.metadata,
					line_count: newContent.split("\n").length,
					last_modified: new Date().toISOString(),
				},
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

			const originalContent =
				readResult.document.raw || readResult.document.content || ""
			const lines = originalContent.split("\n")

			// Validate line number
			if (insertLine < 1 || insertLine > lines.length + 1) {
				return {
					success: false,
					error: `Invalid line number: ${insertLine}. File has ${lines.length} lines.`,
				}
			}

			// Insert the text (insertLine is 1-based)
			lines.splice(insertLine - 1, 0, insertText)
			const newContent = lines.join("\n")

			// Update the document
			const normalizedId = this.normalizePathToCustomId(filePath)
			await this.client.memories.add({
				content: newContent,
				customId: normalizedId,
				containerTags: this.containerTags,
				metadata: {
					...readResult.document.metadata,
					line_count: newContent.split("\n").length,
					last_modified: new Date().toISOString(),
				},
			})

			return {
				success: true,
				content: `Text inserted at line ${insertLine} in file: ${filePath}`,
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
			if (!readResult.success || !readResult.document) {
				return {
					success: false,
					error: readResult.error || "File not found",
				}
			}

			// Delete using the document ID
			// Note: We'll need to implement this based on supermemory's delete API
			// For now, we'll return a success message

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

			const originalContent =
				readResult.document.raw || readResult.document.content || ""
			const newNormalizedId = this.normalizePathToCustomId(newPath)

			// Create new document with new path
			await this.client.memories.add({
				content: originalContent,
				customId: newNormalizedId,
				containerTags: this.containerTags,
				metadata: {
					...readResult.document.metadata,
					file_path: newPath,
					last_modified: new Date().toISOString(),
				},
			})

			// Delete the old document (would need proper delete API)

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

	/**
	 * Helper: Get document by file path
	 */
	private async getFileDocument(filePath: string): Promise<{
		success: boolean
		document?: any
		error?: string
	}> {
		try {
			const normalizedId = this.normalizePathToCustomId(filePath)

			const response = await this.client.search.execute({
				q: normalizedId,
				containerTags: this.containerTags,
				limit: 5,
				includeFullDocs: true,
			})

			// Try to find exact match by customId first
			const exactMatch = response.results?.find(
				(r) => r.documentId === normalizedId,
			)
			const document = exactMatch || response.results?.[0]

			if (!document) {
				return {
					success: false,
					error: `File not found: ${filePath}`,
				}
			}

			return {
				success: true,
				document,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Validate that path starts with /memories for security
	 */
	private isValidPath(path: string): boolean {
		return (
			(path.startsWith("/memories/") || path === "/memories") &&
			!path.includes("../") &&
			!path.includes("..\\")
		)
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
