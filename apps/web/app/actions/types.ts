export type Space = {
  id: number;
  name: string;
  numberOfMemories?: number;
};

export type ServerActionReturnType<T> = Promise<{
  error?: string;
  success: boolean;
  data?: T;
}>;
