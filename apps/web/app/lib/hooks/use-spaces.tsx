import { Space } from "@supermemory/db/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ExtraSpaceMetaData = {
	permissions: {
		canRead: boolean;
		canEdit: boolean;
		isOwner: boolean;
		isPublic: boolean;
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

export async function fetchSpaces(): Promise<SpaceResponse> {
	const response = await fetch(`/backend/v1/spaces`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch spaces");
	}

	const resp = (await response.json()) as SpaceResponse;

	resp.spaces.push({
		id: 0,
		uuid: "<HOME>",
		name: "Home",
		createdAt: new Date(),
		updatedAt: new Date(),
		ownerId: 0,
		isPublic: false,
		permissions: {
			canRead: false,
			canEdit: false,
			isOwner: false,
			isPublic: false,
		},
		owner: null,
		favorited: false,
	});

	return resp;
}

async function createSpace(data: {
	spaceName: string;
	isPublic: boolean;
}): Promise<CreateSpaceResponse> {
	const response = await fetch(`/backend/v1/spaces/create`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error((error as { error: string }).error || "Failed to create space");
	}

	return response.json();
}

async function makeFavorite(spaceId: string) {
	const response = await fetch(`/backend/v1/spaces/favorite/${spaceId}`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to make favorite");
	}

	return response.json();
}

export function useSpaces() {
	const queryClient = useQueryClient();
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["spaces"],
		queryFn: fetchSpaces,
		staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
	});

	const createMutation = useMutation({
		mutationFn: async (data: { spaceName: string; isPublic: boolean }) => {
			return createSpace(data);
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["spaces"] });
		},
		onError: (error: Error) => {
			console.error("Failed to create space", error);
			toast.error(error.message);
		},
	});

	return {
		spaces: data?.spaces ?? [],
		isLoading,
		error,
		refetch,
		createSpace: createMutation.mutate,
		isCreating: createMutation.isPending,
		createError: createMutation.error,
	};
}
