export interface Logger {
	debug: (message: string, data?: unknown) => void
	info: (message: string, data?: unknown) => void
	warn: (message: string, data?: unknown) => void
	error: (message: string, data?: unknown) => void
}

export const createLogger = (verbose: boolean): Logger => {
	if (!verbose) {
		return {
			debug: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		}
	}

	return {
		debug: (message: string, data?: unknown) => {
			console.log(
				`[supermemory] ${message}`,
				data ? JSON.stringify(data, null, 2) : "",
			)
		},
		info: (message: string, data?: unknown) => {
			console.log(
				`[supermemory] ${message}`,
				data ? JSON.stringify(data, null, 2) : "",
			)
		},
		warn: (message: string, data?: unknown) => {
			console.warn(
				`[supermemory] ${message}`,
				data ? JSON.stringify(data, null, 2) : "",
			)
		},
		error: (message: string, data?: unknown) => {
			console.error(
				`[supermemory] ${message}`,
				data ? JSON.stringify(data, null, 2) : "",
			)
		},
	}
}
