import * as fs from "node:fs"
import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import Supermemory from "supermemory"
import { getApiKey, getBaseUrl } from "../config.js"
import { AuthenticationError, CliError, EXIT_CODES } from "../utils/error-handler.js"
import { hasStdinData, readStdin } from "../utils/stdin.js"
import { resolvePath } from "../utils/platform.js"

interface AddOptions {
    file?: boolean
    tags?: string
    project?: string
    metadata?: string
}

export function createAddCommand(): Command {
    const add = new Command("add")
        .description("Add a new memory to Supermemory")
        .argument("[content]", "Content to add (text or file path if --file is used)")
        .option("-f, --file", "Treat content as a file path to read")
        .option("-t, --tags <tags>", "Comma-separated container tags")
        .option("-p, --project <id>", "Project ID to add memory to")
        .option("-m, --metadata <json>", "JSON metadata to attach")
        .action(async (content: string | undefined, options: AddOptions) => {
            const apiKey = getApiKey()
            if (!apiKey) {
                throw new AuthenticationError()
            }

            let memoryContent: string

            // Check for piped input first
            if (hasStdinData()) {
                const spinner = ora("Reading from stdin...").start()
                try {
                    memoryContent = await readStdin()
                    spinner.succeed("Read content from stdin")
                } catch (error) {
                    spinner.fail("Failed to read from stdin")
                    throw error
                }
            } else if (options.file && content) {
                // Read from file
                const filePath = resolvePath(content)
                const spinner = ora(`Reading file: ${filePath}`).start()

                try {
                    if (!fs.existsSync(filePath)) {
                        spinner.fail("File not found")
                        throw new CliError(`File not found: ${filePath}`, EXIT_CODES.INVALID_ARGUMENTS)
                    }

                    memoryContent = fs.readFileSync(filePath, "utf-8")
                    spinner.succeed(`Read file: ${filePath}`)
                } catch (error) {
                    if (error instanceof CliError) throw error
                    spinner.fail("Failed to read file")
                    throw new CliError(
                        `Failed to read file: ${filePath}`,
                        EXIT_CODES.GENERAL_ERROR,
                        error instanceof Error ? error : undefined,
                    )
                }
            } else if (content) {
                // Use content directly
                memoryContent = content
            } else {
                throw new CliError(
                    "No content provided. Usage: sm add <content> or sm add --file <path> or pipe content",
                    EXIT_CODES.INVALID_ARGUMENTS,
                )
            }

            if (!memoryContent.trim()) {
                throw new CliError("Content cannot be empty", EXIT_CODES.INVALID_ARGUMENTS)
            }

            // Parse metadata if provided
            let metadata: Record<string, string | number | boolean> | undefined
            if (options.metadata) {
                try {
                    metadata = JSON.parse(options.metadata)
                } catch {
                    throw new CliError(
                        "Invalid metadata JSON format",
                        EXIT_CODES.INVALID_ARGUMENTS,
                    )
                }
            }

            // Parse container tags
            const containerTags: string[] = []
            if (options.tags) {
                containerTags.push(...options.tags.split(",").map((t) => t.trim()))
            }
            if (options.project) {
                containerTags.push(`sm_project_${options.project}`)
            }

            const spinner = ora("Adding memory...").start()

            try {
                const client = new Supermemory({
                    apiKey,
                    baseURL: getBaseUrl(),
                })

                const result = await client.memories.add({
                    content: memoryContent,
                    ...(containerTags.length > 0 && { containerTags }),
                    ...(metadata && { metadata }),
                })

                spinner.succeed(chalk.green("Memory added successfully"))
                console.log(chalk.gray(`  ID: ${result.id}`))
                console.log(chalk.gray(`  Status: ${result.status}`))

                if (containerTags.length > 0) {
                    console.log(chalk.gray(`  Tags: ${containerTags.join(", ")}`))
                }
            } catch (error) {
                spinner.fail("Failed to add memory")
                throw new CliError(
                    error instanceof Error ? error.message : "Unknown error",
                    EXIT_CODES.API_ERROR,
                    error instanceof Error ? error : undefined,
                )
            }
        })

    return add
}
