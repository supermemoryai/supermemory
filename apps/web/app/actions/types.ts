export type Space = {
	id: number;
	name: string;
	numberOfMemories?: number;
	createdAt?: string;
};

export type ServerActionReturnType<T> = Promise<{
	error?: string;
	success: boolean;
	data?: T;
}>;
