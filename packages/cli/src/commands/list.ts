import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import Table from "cli-table3"
import Supermemory from "supermemory"
import { getApiKey, getBaseUrl } from "../config.js"
import { AuthenticationError, CliError, EXIT_CODES } from "../utils/error-handler.js"
import { getTerminalWidth } from "../utils/platform.js"

interface ListOptions {
    limit?: string
    page?: string
    status?: string
    project?: string
    tags?: string
    json?: boolean
}

export function createListCommand(): Command {
    const list = new Command("list")
        .description("List your memories")
        .option("-l, --limit <number>", "Number of items to show", "10")
        .option("--page <number>", "Page number", "1")
        .option("-s, --status <status>", "Filter by status (queued, processing, done, failed)")
        .option("-p, --project <id>", "Filter by project ID")
        .option("--tags <tags>", "Comma-separated container tags to filter")
        .option("--json", "Output results as JSON")
        .action(async (options: ListOptions) => {
            const apiKey = getApiKey()
            if (!apiKey) {
                throw new AuthenticationError()
            }

            const limit = Number.parseInt(options.limit || "10", 10)
            const page = Number.parseInt(options.page || "1", 10)

            if (Number.isNaN(limit) || limit < 1) {
                throw new CliError("Invalid limit value", EXIT_CODES.INVALID_ARGUMENTS)
            }

            if (Number.isNaN(page) || page < 1) {
                throw new CliError("Invalid page value", EXIT_CODES.INVALID_ARGUMENTS)
            }

            // Parse container tags
            const containerTags: string[] = []
            if (options.tags) {
                containerTags.push(...options.tags.split(",").map((t) => t.trim()))
            }
            if (options.project) {
                containerTags.push(`sm_project_${options.project}`)
            }

            const spinner = ora("Fetching memories...").start()

            try {
                const client = new Supermemory({
                    apiKey,
                    baseURL: getBaseUrl(),
                })

                const results = await client.memories.list({
                    limit,
                    page,
                    ...(containerTags.length > 0 && { containerTags }),
                    ...(options.status && { status: options.status }),
                })

                spinner.stop()

                if (options.json) {
                    console.log(JSON.stringify(results, null, 2))
                    return
                }

                const memories = results.memories || []

                if (memories.length === 0) {
                    console.log(chalk.yellow("No memories found."))
                    return
                }

                const pagination = results.pagination
                const totalPages = pagination?.totalPages || 1
                const totalItems = pagination?.totalItems || memories.length

                console.log(
                    chalk.green(`\n✅ Showing ${memories.length} of ${totalItems} memories (page ${page}/${totalPages})\n`),
                )

                // Calculate available width
                const termWidth = Math.min(getTerminalWidth(), 120)
                const idWidth = 24
                const statusWidth = 12
                const typeWidth = 10
                const dateWidth = 12
                const titleWidth = Math.max(termWidth - idWidth - statusWidth - typeWidth - dateWidth - 16, 20)

                const table = new Table({
                    head: [
                        chalk.bold("ID"),
                        chalk.bold("Status"),
                        chalk.bold("Type"),
                        chalk.bold("Title"),
                        chalk.bold("Created"),
                    ],
                    colWidths: [idWidth, statusWidth, typeWidth, titleWidth, dateWidth],
                    wordWrap: true,
                    wrapOnWordBoundary: true,
                })

                for (const memory of memories) {
                    const id = memory.id || "N/A"
                    const status = formatStatus(memory.status || "unknown")
                    const type = memory.type || "text"

                    let title = memory.title || memory.summary || "Untitled"
                    if (title.length > titleWidth - 5) {
                        title = `${title.slice(0, titleWidth - 5)}...`
                    }

                    const createdAt = memory.createdAt
                        ? new Date(memory.createdAt).toLocaleDateString()
                        : "N/A"

                    table.push([id, status, type, title, createdAt])
                }

                console.log(table.toString())

                if (totalPages > page) {
                    console.log(chalk.gray(`\nShow next page: sm list --page ${page + 1}`))
                }
            } catch (error) {
                spinner.fail("Failed to fetch memories")
                throw new CliError(
                    error instanceof Error ? error.message : "Unknown error",
                    EXIT_CODES.API_ERROR,
                    error instanceof Error ? error : undefined,
                )
            }
        })

    return list
}

function formatStatus(status: string): string {
    switch (status) {
        case "done":
            return chalk.green(status)
        case "failed":
            return chalk.red(status)
        case "processing":
        case "extracting":
        case "chunking":
        case "embedding":
        case "indexing":
            return chalk.yellow(status)
        case "queued":
            return chalk.gray(status)
        default:
            return status
    }
}
