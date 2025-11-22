import { getPreferenceValues, showToast, Toast } from "@raycast/api";

export interface Project {
  id: string;
  name: string;
  containerTag: string;
  description?: string;
}

export interface Memory {
  id: string;
  content: string;
  title?: string;
  url?: string;
  containerTag?: string;
  createdAt: string;
}

export interface SearchResult {
  documentId: string;
  chunks: unknown[];
  title?: string;
  metadata: Record<string, unknown>;
  score?: number;
  createdAt: string;
  updatedAt: string;
  type: string;
}

export interface AddMemoryRequest {
  content: string;
  containerTags?: string[];
  title?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface AddProjectRequest {
  name: string;
}

export interface SearchRequest {
  q: string;
  containerTags?: string[];
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  timing: number;
  total: number;
}

const API_BASE_URL = "https://api.supermemory.ai";

class SupermemoryAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "SupermemoryAPIError";
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey;
}

async function makeAuthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError(
          "Invalid API key. Please check your API key in preferences. Get a new one from https://supermemory.link/raycast",
        );
      }

      let errorMessage = `API request failed: ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as { message?: string };
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Ignore JSON parsing errors, use default message
      }

      throw new SupermemoryAPIError(errorMessage, response.status);
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new SupermemoryAPIError("Invalid response format from API");
    }

    const data = (await response.json()) as T;
    return data;
  } catch (err) {
    if (
      err instanceof AuthenticationError ||
      err instanceof SupermemoryAPIError
    ) {
      throw err;
    }

    // Handle network errors or other fetch errors
    throw new SupermemoryAPIError(
      `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const response = await makeAuthenticatedRequest<{ projects: Project[] }>(
      "/v3/projects",
    );
    return response.projects || [];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch projects",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

export async function addProject(request: AddProjectRequest): Promise<Project> {
  const response = await makeAuthenticatedRequest<Project>("/v3/projects", {
    method: "POST",
    body: JSON.stringify(request),
  });

  await showToast({
    style: Toast.Style.Success,
    title: "Project Added",
    message: "Successfully added project to Supermemory",
  });

  return response;
}

export async function addMemory(request: AddMemoryRequest): Promise<Memory> {
  try {
    const response = await makeAuthenticatedRequest<Memory>("/v3/documents", {
      method: "POST",
      body: JSON.stringify(request),
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Memory Added",
      message: "Successfully added memory to Supermemory",
    });

    return response;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add memory",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

export async function searchMemories(
  request: SearchRequest,
): Promise<SearchResult[]> {
  try {
    const response = await makeAuthenticatedRequest<SearchResponse>(
      "/v3/search",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );

    return response.results || [];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to search memories",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

// Helper function to check if API key is configured and valid
export async function fetchSettings(): Promise<object> {
  const response = await makeAuthenticatedRequest<object>("/v3/settings");
  return response;
}
