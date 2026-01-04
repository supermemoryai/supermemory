/**
 * Check if stdin has piped data available
 */
export function hasStdinData(): boolean {
    return !process.stdin.isTTY
}

/**
 * Read all data from stdin as a string
 */
export async function readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []

        process.stdin.on("data", (chunk) => {
            chunks.push(Buffer.from(chunk))
        })

        process.stdin.on("end", () => {
            const content = Buffer.concat(chunks).toString("utf-8").trim()
            resolve(content)
        })

        process.stdin.on("error", (error) => {
            reject(error)
        })

        // Set a timeout for reading stdin
        setTimeout(() => {
            if (chunks.length === 0) {
                resolve("")
            }
        }, 100)
    })
}

/**
 * Read stdin with a timeout
 */
export async function readStdinWithTimeout(timeoutMs = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        let resolved = false

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true
                process.stdin.destroy()
                resolve(Buffer.concat(chunks).toString("utf-8").trim())
            }
        }, timeoutMs)

        process.stdin.on("data", (chunk) => {
            chunks.push(Buffer.from(chunk))
        })

        process.stdin.on("end", () => {
            if (!resolved) {
                resolved = true
                clearTimeout(timeout)
                resolve(Buffer.concat(chunks).toString("utf-8").trim())
            }
        })

        process.stdin.on("error", (error) => {
            if (!resolved) {
                resolved = true
                clearTimeout(timeout)
                reject(error)
            }
        })
    })
}
