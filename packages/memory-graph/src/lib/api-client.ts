import type { DocumentsResponse } from "@/api-types";

export interface FetchDocumentsOptions {
	apiKey: string;
	baseUrl?: string;
	page?: number;
	limit?: number;
	sort?: "createdAt" | "updatedAt";
	order?: "asc" | "desc";
	containerTags?: string[];
	signal?: AbortSignal;
}

export interface ApiClientError extends Error {
	status?: number;
	statusText?: string;
	response?: unknown;
}

/**
 * Creates an API client error with additional context
 */
function createApiError(
	message: string,
	status?: number,
	statusText?: string,
	response?: unknown,
): ApiClientError {
	const error = new Error(message) as ApiClientError;
	error.name = "ApiClientError";
	error.status = status;
	error.statusText = statusText;
	error.response = response;
	return error;
}

/**
 * Fetches documents with their memory entries from the Supermemory API
 *
 * @param options - Configuration options for the API request
 * @returns Promise resolving to the documents response
 * @throws ApiClientError if the request fails
 */
export async function fetchDocuments(
	options: FetchDocumentsOptions,
): Promise<DocumentsResponse> {
	const {
		apiKey,
		baseUrl = "https://api.supermemory.ai",
		page = 1,
		limit = 50,
		sort = "createdAt",
		order = "desc",
		containerTags,
		signal,
	} = options;

	// Validate required parameters
	if (!apiKey) {
		throw createApiError("API key is required");
	}

	// Construct the full URL
	const url = `${baseUrl}/v3/documents/documents`;

	// Build request body
	const body: {
		page: number;
		limit: number;
		sort: string;
		order: string;
		containerTags?: string[];
	} = {
		page,
		limit,
		sort,
		order,
	};

	if (containerTags && containerTags.length > 0) {
		body.containerTags = containerTags;
	}

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
			signal,
		});

		// Handle non-OK responses
		if (!response.ok) {
			let errorMessage = `Failed to fetch documents: ${response.status} ${response.statusText}`;
			let errorResponse: unknown;

			try {
				errorResponse = await response.json();
				if (
					errorResponse &&
					typeof errorResponse === "object" &&
					"message" in errorResponse
				) {
					errorMessage = `API Error: ${(errorResponse as { message: string }).message}`;
				}
			} catch {
				// If response is not JSON, use default error message
			}

			throw createApiError(
				errorMessage,
				response.status,
				response.statusText,
				errorResponse,
			);
		}

		// Parse and validate response
		const data = await response.json();

		// Basic validation of response structure
		if (!data || typeof data !== "object") {
			throw createApiError("Invalid response format: expected an object");
		}

		if (!("documents" in data) || !Array.isArray(data.documents)) {
			throw createApiError(
				"Invalid response format: missing documents array",
			);
		}

		if (!("pagination" in data) || typeof data.pagination !== "object") {
			throw createApiError(
				"Invalid response format: missing pagination object",
			);
		}

		return data as DocumentsResponse;
	} catch (error) {
		// Re-throw ApiClientError as-is
		if ((error as ApiClientError).name === "ApiClientError") {
			throw error;
		}

		// Handle network errors
		if (error instanceof TypeError && error.message.includes("fetch")) {
			throw createApiError(
				`Network error: Unable to connect to ${baseUrl}. Please check your internet connection.`,
			);
		}

		// Handle abort errors
		if (error instanceof Error && error.name === "AbortError") {
			throw createApiError("Request was aborted");
		}

		// Handle other errors
		throw createApiError(
			`Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Fetches a single page of documents (convenience wrapper)
 */
export async function fetchDocumentsPage(
	apiKey: string,
	page: number,
	baseUrl?: string,
	signal?: AbortSignal,
): Promise<DocumentsResponse> {
	return fetchDocuments({
		apiKey,
		baseUrl,
		page,
		limit: 50,
		signal,
	});
}

/**
 * Validates an API key by making a test request
 *
 * @param apiKey - The API key to validate
 * @param baseUrl - Optional base URL for the API
 * @returns Promise resolving to true if valid, false otherwise
 */
export async function validateApiKey(
	apiKey: string,
	baseUrl?: string,
): Promise<boolean> {
	try {
		await fetchDocuments({
			apiKey,
			baseUrl,
			page: 1,
			limit: 1,
		});
		return true;
	} catch (error) {
		// Check if it's an authentication error
		if ((error as ApiClientError).status === 401) {
			return false;
		}
		// Other errors might indicate valid key but other issues
		// We'll return true in those cases to not block the user
		return true;
	}
}
