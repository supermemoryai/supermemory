import { Space } from "@supermemory/db/schema";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getBaseURL } from "@/lib/utils";

export type ExtraSpaceMetaData = {
  permissions: {
    canRead: boolean;
    canEdit: boolean;
    isOwner: boolean;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    profileImage: string;
  } | null;
  favorited: boolean;
};

type SpaceResponse = {
  spaces: (Space & ExtraSpaceMetaData)[];
};

type CreateSpaceResponse = {
  message: string;
  space: {
    name: string;
    uuid: string;
    isPublic: boolean;
  };
};

async function fetchSpaces(): Promise<SpaceResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "GET_SPACES", payload: undefined },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      }
    );
  });
}

async function createSpace(data: {
  spaceName: string;
  isPublic: boolean;
}): Promise<CreateSpaceResponse> {
  const baseURL = await getBaseURL();
  const response = await fetch(`${baseURL}/backend/api/space/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      (error as { error: string }).error || "Failed to create space"
    );
  }

  return response.json();
}

async function makeFavorite(spaceId: string) {
  const baseURL = await getBaseURL();
  const response = await fetch(
    `${baseURL}/backend/api/space/favorite/${spaceId}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to make favorite");
  }

  return response.json();
}

export function useSpaces() {
  const [spaces, setSpaces] = useState<(Space & ExtraSpaceMetaData)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<Error | null>(null);

  const loadSpaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchSpaces();
      setSpaces(response.spaces);
      setError(null);
    } catch (err) {
      console.error("Error fetching spaces:", err); // Add error logging
      setError(
        err instanceof Error ? err : new Error("Failed to fetch spaces")
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array since we don't use any external values

  useEffect(() => {
    loadSpaces().catch((err) => {
      console.error("Failed to load spaces:", err); // Add error handling
    });
  }, []); // Use empty dependency array instead of [loadSpaces]

  const handleCreateSpace = async (data: {
    spaceName: string;
    isPublic: boolean;
  }) => {
    try {
      setIsCreating(true);
      setCreateError(null);
      const response = await createSpace(data);
      toast.success(response.message);
      loadSpaces(); // Refresh spaces after creation
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to create space");
      console.error("Failed to create space", error);
      toast.error(error.message);
      setCreateError(error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    spaces,
    isLoading,
    error,
    refetch: loadSpaces,
    createSpace: handleCreateSpace,
    isCreating,
    createError,
  };
}
