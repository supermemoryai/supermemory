declare module "*.html" {
	const content: string
	export default content
}

// d3-force-3d does not publish TypeScript declarations.
declare module "d3-force-3d" {
	interface Force {
		(alpha: number): void
		initialize?: (nodes: unknown[], ...args: unknown[]) => void
	}

	interface StrengthForce extends Force {
		strength<T>(value: number | ((value: T) => number)): this
	}

	interface LinkForce extends StrengthForce {
		distance<T>(value: number | ((value: T) => number)): this
	}

	export function forceCenter(...args: number[]): Force
	export function forceCollide(radius?: number): Force
	export function forceLink(): LinkForce
	export function forceManyBody(): StrengthForce
	export function forceRadial(radius?: number): StrengthForce
}
