import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import Table from "cli-table3"
import Supermemory from "supermemory"
import { getApiKey, getBaseUrl } from "../config.js"
import { AuthenticationError, CliError, EXIT_CODES } from "../utils/error-handler.js"
import { getTerminalWidth } from "../utils/platform.js"

interface SearchOptions {
    limit?: string
    threshold?: string
    project?: string
    tags?: string
    json?: boolean
    full?: boolean
}

export function createSearchCommand(): Command {
    const search = new Command("search")
        .description("Search through your memories")
        .argument("<query>", "Search query")
        .option("-l, --limit <number>", "Maximum number of results", "10")
        .option("-t, --threshold <number>", "Similarity threshold (0-1)", "0.5")
        .option("-p, --project <id>", "Filter by project ID")
        .option("--tags <tags>", "Comma-separated container tags to filter")
        .option("--json", "Output results as JSON")
        .option("--full", "Include full document content")
        .action(async (query: string, options: SearchOptions) => {
            const apiKey = getApiKey()
            if (!apiKey) {
                throw new AuthenticationError()
            }

            const limit = Number.parseInt(options.limit || "10", 10)
            const threshold = Number.parseFloat(options.threshold || "0.5")

            if (Number.isNaN(limit) || limit < 1) {
                throw new CliError("Invalid limit value", EXIT_CODES.INVALID_ARGUMENTS)
            }

            if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
                throw new CliError("Threshold must be between 0 and 1", EXIT_CODES.INVALID_ARGUMENTS)
            }

            // Parse container tags
            const containerTags: string[] = []
            if (options.tags) {
                containerTags.push(...options.tags.split(",").map((t) => t.trim()))
            }
            if (options.project) {
                containerTags.push(`sm_project_${options.project}`)
            }

            const spinner = ora("Searching memories...").start()

            try {
                const client = new Supermemory({
                    apiKey,
                    baseURL: getBaseUrl(),
                })

                const results = await client.search.execute({
                    q: query,
                    limit,
                    chunkThreshold: threshold,
                    ...(containerTags.length > 0 && { containerTags }),
                    includeFullDocs: options.full,
                })

                spinner.stop()

                if (options.json) {
                    console.log(JSON.stringify(results, null, 2))
                    return
                }

                if (!results.results || results.results.length === 0) {
                    console.log(chalk.yellow("No results found."))
                    return
                }

                console.log(chalk.green(`\n✅ Found ${results.results.length} result(s)\n`))

                // Calculate available width
                const termWidth = Math.min(getTerminalWidth(), 120)
                const idWidth = 24
                const scoreWidth = 8
                const typeWidth = 10
                const contentWidth = Math.max(termWidth - idWidth - scoreWidth - typeWidth - 12, 30)

                const table = new Table({
                    head: [
                        chalk.bold("ID"),
                        chalk.bold("Score"),
                        chalk.bold("Type"),
                        chalk.bold("Content Preview"),
                    ],
                    colWidths: [idWidth, scoreWidth, typeWidth, contentWidth],
                    wordWrap: true,
                    wrapOnWordBoundary: true,
                })

                for (const result of results.results) {
                    const documentId = result.documentId || "N/A"
                    const score = result.score?.toFixed(3) || "N/A"
                    const type = result.type || "text"

                    // Get content preview from first chunk
                    let content = "No content"
                    if (result.chunks && result.chunks.length > 0) {
                        content = result.chunks[0].content || ""
                    } else if (result.title) {
                        content = result.title
                    }

                    // Truncate content for preview
                    const maxLen = contentWidth - 5
                    if (content.length > maxLen) {
                        content = `${content.slice(0, maxLen)}...`
                    }

                    table.push([documentId, score, type, content])
                }

                console.log(table.toString())

                if (results.timing) {
                    console.log(chalk.gray(`\nSearch completed in ${results.timing}ms`))
                }
            } catch (error) {
                spinner.fail("Search failed")
                throw new CliError(
                    error instanceof Error ? error.message : "Unknown error",
                    EXIT_CODES.API_ERROR,
                    error instanceof Error ? error : undefined,
                )
            }
        })

    return search
}
