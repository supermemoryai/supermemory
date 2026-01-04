import * as os from "node:os"
import * as path from "node:path"

/**
 * Get the current platform
 */
export function getPlatform(): NodeJS.Platform {
    return process.platform
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
    return process.platform === "win32"
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
    return process.platform === "darwin"
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
    return process.platform === "linux"
}

/**
 * Get the platform-specific newline character
 */
export function getNewline(): string {
    return os.EOL
}

/**
 * Join paths using the platform-specific separator
 */
export function joinPaths(...paths: string[]): string {
    return path.join(...paths)
}

/**
 * Normalize a path for the current platform
 */
export function normalizePath(inputPath: string): string {
    return path.normalize(inputPath)
}

/**
 * Get the home directory
 */
export function getHomeDir(): string {
    return os.homedir()
}

/**
 * Resolve a path, expanding ~ to home directory
 */
export function resolvePath(inputPath: string): string {
    if (inputPath.startsWith("~")) {
        return path.join(getHomeDir(), inputPath.slice(1))
    }
    return path.resolve(inputPath)
}

/**
 * Get terminal width for formatting
 */
export function getTerminalWidth(): number {
    return process.stdout.columns || 80
}

/**
 * Check if stdout is a TTY (interactive terminal)
 */
export function isInteractive(): boolean {
    return process.stdout.isTTY === true
}

/**
 * Check if colors are supported
 */
export function supportsColor(): boolean {
    if (process.env.NO_COLOR !== undefined) {
        return false
    }
    if (process.env.FORCE_COLOR !== undefined) {
        return true
    }
    return isInteractive()
}
