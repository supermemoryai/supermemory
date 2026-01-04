import chalk from "chalk"

export const EXIT_CODES = {
    SUCCESS: 0,
    GENERAL_ERROR: 1,
    INVALID_ARGUMENTS: 2,
    NOT_AUTHENTICATED: 3,
    API_ERROR: 4,
    CANCELLED: 130, // Standard exit code for SIGINT
} as const

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES]

export class CliError extends Error {
    constructor(
        message: string,
        public readonly exitCode: ExitCode = EXIT_CODES.GENERAL_ERROR,
        public readonly cause?: Error,
    ) {
        super(message)
        this.name = "CliError"
    }
}

export class AuthenticationError extends CliError {
    constructor(message = "Not authenticated. Run: sm auth <your-api-key>") {
        super(message, EXIT_CODES.NOT_AUTHENTICATED)
        this.name = "AuthenticationError"
    }
}

export class ApiError extends CliError {
    constructor(
        message: string,
        public readonly statusCode?: number,
        cause?: Error,
    ) {
        super(message, EXIT_CODES.API_ERROR, cause)
        this.name = "ApiError"
    }
}

let debugMode = false

export function setDebugMode(debug: boolean): void {
    debugMode = debug
}

export function isDebugMode(): boolean {
    return debugMode
}

export function handleError(error: unknown): never {
    if (error instanceof CliError) {
        console.error(chalk.red(`❌ ${error.message}`))

        if (debugMode && error.cause) {
            console.error(chalk.gray("\nStack trace:"))
            console.error(chalk.gray(error.cause.stack))
        }

        process.exit(error.exitCode)
    }

    if (error instanceof Error) {
        console.error(chalk.red(`❌ ${error.message}`))

        if (debugMode) {
            console.error(chalk.gray("\nStack trace:"))
            console.error(chalk.gray(error.stack))
        }

        process.exit(EXIT_CODES.GENERAL_ERROR)
    }

    console.error(chalk.red("❌ An unexpected error occurred"))

    if (debugMode) {
        console.error(chalk.gray(String(error)))
    }

    process.exit(EXIT_CODES.GENERAL_ERROR)
}

export function wrapCommand<T extends (...args: unknown[]) => Promise<void>>(
    fn: T,
): T {
    return (async (...args: unknown[]) => {
        try {
            await fn(...args)
        } catch (error) {
            handleError(error)
        }
    }) as T
}
