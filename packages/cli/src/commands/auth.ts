import { Command } from "commander"
import chalk from "chalk"
import { getApiKey, setApiKey, clearApiKey, getConfigPath } from "../config.js"
import { CliError, EXIT_CODES } from "../utils/error-handler.js"

export function createAuthCommand(): Command {
    const auth = new Command("auth")
        .description("Manage authentication with Supermemory API")
        .argument("[key]", "API key to save")
        .option("--clear", "Clear saved API key")
        .option("--show", "Show current API key status")
        .action(async (key: string | undefined, options: { clear?: boolean; show?: boolean }) => {
            if (options.clear) {
                clearApiKey()
                console.log(chalk.green("✅ API key cleared successfully"))
                console.log(chalk.gray(`Config file: ${getConfigPath()}`))
                return
            }

            if (options.show) {
                const currentKey = getApiKey()
                if (currentKey) {
                    const masked = `${currentKey.slice(0, 8)}...${currentKey.slice(-4)}`
                    console.log(chalk.green("✅ Authenticated"))
                    console.log(chalk.gray(`API Key: ${masked}`))
                    console.log(chalk.gray(`Config file: ${getConfigPath()}`))
                } else {
                    console.log(chalk.yellow("⚠️  Not authenticated"))
                    console.log(chalk.gray("Run: sm auth <your-api-key>"))
                }
                return
            }

            if (!key) {
                // No key provided, show status
                const currentKey = getApiKey()
                if (currentKey) {
                    const masked = `${currentKey.slice(0, 8)}...${currentKey.slice(-4)}`
                    console.log(chalk.green("✅ Authenticated"))
                    console.log(chalk.gray(`API Key: ${masked}`))
                } else {
                    console.log(chalk.yellow("⚠️  Not authenticated"))
                    console.log(chalk.gray("\nUsage:"))
                    console.log(chalk.gray("  sm auth <api-key>   Save API key"))
                    console.log(chalk.gray("  sm auth --clear     Clear saved key"))
                    console.log(chalk.gray("  sm auth --show      Show current status"))
                }
                return
            }

            // Validate key format (basic check)
            if (key.length < 10) {
                throw new CliError(
                    "Invalid API key format. API key should be at least 10 characters.",
                    EXIT_CODES.INVALID_ARGUMENTS,
                )
            }

            setApiKey(key)
            console.log(chalk.green("✅ API key saved successfully"))
            console.log(chalk.gray(`Config file: ${getConfigPath()}`))
            console.log(chalk.gray("\nYou can now use Supermemory CLI commands."))
        })

    return auth
}
