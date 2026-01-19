#!/usr/bin/env bun
import { spawn } from "child_process"
import path from "path"

const args = process.argv.slice(2)
const filter = args[0] // e.g., "typescript", "python", "integrations", or specific file

const TESTS_DIR = path.join(import.meta.dir, "tests")

interface TestFile {
  name: string
  path: string
  type: "ts" | "py"
}

function getTests(): TestFile[] {
  const tests: TestFile[] = []

  // TypeScript tests
  const tsTests = ["quickstart", "sdk", "search", "user-profiles"]
  for (const t of tsTests) {
    tests.push({
      name: `typescript/${t}`,
      path: path.join(TESTS_DIR, "typescript", `${t}.ts`),
      type: "ts",
    })
  }

  // Python tests
  const pyTests = ["quickstart", "sdk", "search", "user_profiles"]
  for (const t of pyTests) {
    tests.push({
      name: `python/${t}`,
      path: path.join(TESTS_DIR, "python", `${t}.py`),
      type: "py",
    })
  }

  // Integration tests
  const intTests = [
    { name: "ai-sdk", type: "ts" as const },
    { name: "openai-sdk", type: "ts" as const },
    { name: "openai-sdk", type: "py" as const },
    { name: "claude-memory", type: "ts" as const },
  ]
  for (const t of intTests) {
    tests.push({
      name: `integrations/${t.name}`,
      path: path.join(TESTS_DIR, "integrations", `${t.name}.${t.type === "ts" ? "ts" : "py"}`),
      type: t.type,
    })
  }

  return tests
}

async function runTest(test: TestFile): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n${"=".repeat(60)}`)
    console.log(`Running: ${test.name}`)
    console.log("=".repeat(60))

    const cmd = test.type === "ts" ? "bun" : path.join(import.meta.dir, ".venv", "bin", "python3")
    const proc = spawn(cmd, [test.path], {
      stdio: "inherit",
      env: { ...process.env },
    })

    proc.on("close", (code) => {
      resolve(code === 0)
    })
  })
}

async function main() {
  console.log("Supermemory Docs Test Runner")
  console.log("============================\n")

  let tests = getTests()

  // Filter tests if specified
  if (filter) {
    tests = tests.filter((t) => t.name.includes(filter) || t.type === filter.replace(".", ""))
  }

  if (tests.length === 0) {
    console.log("No tests matched the filter:", filter)
    console.log("\nAvailable tests:")
    getTests().forEach((t) => console.log(`  - ${t.name} (${t.type})`))
    process.exit(1)
  }

  console.log(`Running ${tests.length} test(s)...\n`)

  const results: { test: string; passed: boolean }[] = []

  for (const test of tests) {
    const passed = await runTest(test)
    results.push({ test: test.name, passed })
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`)
  console.log("SUMMARY")
  console.log("=".repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  for (const r of results) {
    console.log(`${r.passed ? "✅" : "❌"} ${r.test}`)
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
