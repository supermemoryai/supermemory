import chalk from "chalk"
import { EXIT_CODES } from "./error-handler.js"

type CleanupFunction = () => void | Promise<void>

const cleanupHandlers: CleanupFunction[] = []
let isShuttingDown = false

export function registerCleanup(handler: CleanupFunction): void {
    cleanupHandlers.push(handler)
}

export function unregisterCleanup(handler: CleanupFunction): void {
    const index = cleanupHandlers.indexOf(handler)
    if (index > -1) {
        cleanupHandlers.splice(index, 1)
    }
}

async function runCleanup(): Promise<void> {
    for (const handler of cleanupHandlers) {
        try {
            await handler()
        } catch {
            // Ignore cleanup errors during shutdown
        }
    }
}

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
        return
    }

    isShuttingDown = true
    console.log(chalk.yellow(`\n⚠️  Received ${signal}. Shutting down gracefully...`))

    await runCleanup()

    process.exit(EXIT_CODES.CANCELLED)
}

export function setupSignalHandlers(): void {
    // Handle Ctrl+C
    process.on("SIGINT", () => {
        gracefulShutdown("SIGINT")
    })

    // Handle termination signal (e.g., from Docker)
    process.on("SIGTERM", () => {
        gracefulShutdown("SIGTERM")
    })

    // Handle Windows-specific signals
    if (process.platform === "win32") {
        // On Windows, SIGBREAK is sent when Ctrl+Break is pressed
        process.on("SIGBREAK", () => {
            gracefulShutdown("SIGBREAK")
        })
    }

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
        console.error(chalk.red("❌ Uncaught exception:"), error.message)
        process.exit(EXIT_CODES.GENERAL_ERROR)
    })

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason) => {
        console.error(chalk.red("❌ Unhandled rejection:"), reason)
        process.exit(EXIT_CODES.GENERAL_ERROR)
    })
}

export function isShuttingDownNow(): boolean {
    return isShuttingDown
}
