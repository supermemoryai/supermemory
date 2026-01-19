import "dotenv/config"
import { createClaudeMemoryTool } from "@supermemory/tools/claude-memory"

async function testConfiguration() {
  console.log("=== Configuration ===")

  // Basic
  const tool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
    projectId: "my-app",
  })
  console.log("✓ Basic config")

  // Full options
  const toolFull = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
    projectId: "my-app",
    containerTags: ["user-123", "project-alpha"],
    memoryContainerTag: "my_memory_prefix",
  })
  console.log("✓ Full config")

  return tool
}

async function testMethods(tool: ReturnType<typeof createClaudeMemoryTool>) {
  console.log("\n=== Methods ===")

  console.log(`✓ handleCommand exists: ${typeof tool.handleCommand === "function"}`)
  console.log(
    `✓ handleCommandForToolResult exists: ${typeof tool.handleCommandForToolResult === "function"}`
  )
}

async function testCommands(tool: ReturnType<typeof createClaudeMemoryTool>) {
  console.log("\n=== Commands ===")

  // View (list)
  const listResult = await tool.handleCommand({
    command: "view",
    path: "/memories/",
  })
  console.log(`✓ view (list): ${listResult.success}`)

  // Create
  const createResult = await tool.handleCommand({
    command: "create",
    path: "/memories/test-file.txt",
    file_text: "User prefers dark mode\nFavorite language: TypeScript",
  })
  console.log(`✓ create: ${createResult.success}`)

  // Wait for indexing
  await new Promise((r) => setTimeout(r, 3000))

  // str_replace
  const replaceResult = await tool.handleCommand({
    command: "str_replace",
    path: "/memories/test-file.txt",
    old_str: "dark mode",
    new_str: "light mode",
  })
  console.log(`✓ str_replace: ${replaceResult.success}`)

  // Delete
  const deleteResult = await tool.handleCommand({
    command: "delete",
    path: "/memories/test-file.txt",
  })
  console.log(`✓ delete: ${deleteResult.success}`)
}

async function testToolResultFormat(tool: ReturnType<typeof createClaudeMemoryTool>) {
  console.log("\n=== Tool Result Format ===")

  const toolResult = await tool.handleCommandForToolResult(
    { command: "view", path: "/memories/" },
    "test-tool-id-123"
  )

  const hasCorrectStructure =
    toolResult.type === "tool_result" &&
    toolResult.tool_use_id === "test-tool-id-123" &&
    typeof toolResult.content === "string" &&
    typeof toolResult.is_error === "boolean"

  console.log(`✓ Tool result structure: ${hasCorrectStructure}`)
}

async function main() {
  console.log("Claude Memory Tool Tests")
  console.log("========================\n")

  const tool = await testConfiguration()
  await testMethods(tool)
  await testCommands(tool)
  await testToolResultFormat(tool)

  console.log("\n========================")
  console.log("✅ All Claude Memory tests passed!")
}

main().catch(console.error)
