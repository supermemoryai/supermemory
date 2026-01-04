import Conf from "conf"

interface CliConfig {
    apiKey?: string
    baseUrl?: string
    defaultProject?: string
}

const config = new Conf<CliConfig>({
    projectName: "supermemory-cli",
    schema: {
        apiKey: {
            type: "string",
        },
        baseUrl: {
            type: "string",
            default: "https://api.supermemory.ai",
        },
        defaultProject: {
            type: "string",
        },
    },
})

export function getApiKey(): string | undefined {
    return config.get("apiKey") || process.env.SUPERMEMORY_API_KEY
}

export function setApiKey(key: string): void {
    config.set("apiKey", key)
}

export function clearApiKey(): void {
    config.delete("apiKey")
}

export function getBaseUrl(): string {
    return config.get("baseUrl") || "https://api.supermemory.ai"
}

export function setBaseUrl(url: string): void {
    config.set("baseUrl", url)
}

export function getDefaultProject(): string | undefined {
    return config.get("defaultProject")
}

export function setDefaultProject(project: string): void {
    config.set("defaultProject", project)
}

export function clearConfig(): void {
    config.clear()
}

export function getConfigPath(): string {
    return config.path
}

export { config }
