export interface RecallRequestState<TInput extends object> {
	input: TInput | null
	query: string
	url: string
}

export interface RecallRequestToken<TInput extends object>
	extends RecallRequestState<TInput> {
	generation: number
}

export function createRecallRequestFreshnessGuard<TInput extends object>() {
	let generation = 0

	return {
		invalidate() {
			generation += 1
		},

		begin(state: RecallRequestState<TInput>): RecallRequestToken<TInput> {
			generation += 1
			return { ...state, generation }
		},

		isCurrent(
			request: RecallRequestToken<TInput>,
			state: RecallRequestState<TInput>,
		) {
			return (
				request.generation === generation &&
				request.input !== null &&
				request.input === state.input &&
				request.query === state.query &&
				request.url === state.url
			)
		},
	}
}
