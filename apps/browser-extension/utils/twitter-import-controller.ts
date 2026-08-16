type TwitterImportRunner = {
	startImport: () => Promise<void>
}

export function createTwitterImportController<Config>(
	createImporter: (config: Config) => TwitterImportRunner,
) {
	let running: Promise<void> | null = null

	return {
		start(config: Config): Promise<void> | null {
			if (running) return null

			const task = (() => {
				try {
					return Promise.resolve(createImporter(config).startImport())
				} catch (error) {
					return Promise.reject(error)
				}
			})()

			running = task
			void task
				.finally(() => {
					if (running === task) running = null
				})
				.catch(() => {})

			return task
		},
	}
}
