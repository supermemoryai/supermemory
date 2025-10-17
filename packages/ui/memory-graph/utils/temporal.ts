import type {
	DocumentWithMemories,
	MemoryEntry,
	ParsedTemporalFilter,
	TemporalFilterState,
} from "../types";

function toDate(value: unknown | null | undefined): Date | undefined {
	if (!value) return undefined;
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}
	const parsed = new Date(value as string);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseTemporalFilterState(
	state?: TemporalFilterState | null,
): ParsedTemporalFilter | null {
	if (!state) return null;

	const asOf = toDate(state.asOf);
	const from = toDate(state.from);
	const to = toDate(state.to);

	if (!asOf && !from && !to) {
		return null;
	}

	return {
		asOf: asOf ?? undefined,
		from: from ?? undefined,
		to: to ?? undefined,
	};
}

function getMemoryInterval(memory: MemoryEntry) {
	const start =
		toDate(memory.validFrom) ??
		toDate(memory.createdAt) ??
		toDate(memory.updatedAt);
	const end =
		toDate(memory.validUntil) ?? toDate(memory.forgetAfter) ?? undefined;

	return { start, end };
}

export function isMemoryWithinFilters(
	memory: MemoryEntry,
	filters: ParsedTemporalFilter | null,
): boolean {
	if (!filters) return true;

	const { start, end } = getMemoryInterval(memory);
	const startMs = start?.getTime() ?? Number.NEGATIVE_INFINITY;
	const endMs = end?.getTime() ?? Number.POSITIVE_INFINITY;

	if (filters.asOf) {
		const asOfMs = filters.asOf.getTime();
		if (asOfMs < startMs) return false;
		if (asOfMs > endMs) return false;
	}

	if (filters.from || filters.to) {
		const windowStart = filters.from?.getTime() ?? Number.NEGATIVE_INFINITY;
		const windowEnd = filters.to?.getTime() ?? Number.POSITIVE_INFINITY;

		if (startMs > windowEnd || endMs < windowStart) {
			return false;
		}
	}

	return true;
}

export interface TemporalStatusMaps {
	documentStatus: Map<string, boolean>;
	memoryStatus: Map<string, boolean>;
}

export function evaluateTemporalStatus(
	documents: DocumentWithMemories[],
	filters: ParsedTemporalFilter | null,
): TemporalStatusMaps | null {
	if (!filters) return null;

	const documentStatus = new Map<string, boolean>();
	const memoryStatus = new Map<string, boolean>();

	for (const doc of documents) {
		let docActive = false;

		for (const memory of doc.memoryEntries ?? []) {
			const active = isMemoryWithinFilters(memory, filters);
			memoryStatus.set(memory.id, active);
			if (active) {
				docActive = true;
			}
		}

		documentStatus.set(doc.id, docActive);
	}

	return { documentStatus, memoryStatus };
}
