import "dotenv/config"
import fs from "fs"
import Supermemory, { toFile } from "supermemory"

const client = new Supermemory()

async function testDocumentsCRUD() {
  console.log("\n=== Document CRUD Operations ===")

  // Create
  const doc = await client.documents.add({
    content: "Test content for TypeScript SDK - " + Date.now(),
  })
  console.log("✓ documents.add:", doc.id)

  // Read
  const fetched = await client.documents.get(doc.id)
  console.log("✓ documents.get:", fetched.id)

  // Update
  const updated = await client.documents.update(doc.id, {
    content: "Updated content - " + Date.now(),
  })
  console.log("✓ documents.update:", updated.id)

  // Wait for processing before delete
  await new Promise((r) => setTimeout(r, 10000))

  // Delete
  await client.documents.delete(doc.id)
  console.log("✓ documents.delete")
}

async function testBatchOperations() {
  console.log("\n=== Batch Operations ===")

  const batch = await client.documents.batchAdd({
    documents: [
      { content: "Batch doc 1 - " + Date.now() },
      { content: "Batch doc 2 - " + Date.now() },
    ],
  })
  console.log("✓ documents.batchAdd:", batch)
}

async function testSearch() {
  console.log("\n=== Search ===")

  const results = await client.search.execute({ q: "test content" })
  console.log("✓ search.execute:", results.results?.length ?? 0, "results")
}

async function testFileUploads() {
  console.log("\n=== File Uploads ===")

  // Using fs.createReadStream
  const testFile = "/tmp/test-doc-upload.txt"
  fs.writeFileSync(testFile, "Test file content")
  await client.documents.uploadFile({ file: fs.createReadStream(testFile) })
  console.log("✓ uploadFile with fs.createReadStream")

  // Using File API
  await client.documents.uploadFile({ file: new File(["my bytes"], "file") })
  console.log("✓ uploadFile with File API")

  // Using toFile
  await client.documents.uploadFile({ file: await toFile(Buffer.from("my bytes"), "file") })
  console.log("✓ uploadFile with toFile")

  fs.unlinkSync(testFile)
}

async function testClientConfig() {
  console.log("\n=== Client Configuration ===")

  // Retries
  const clientWithRetries = new Supermemory({ maxRetries: 0 })
  console.log("✓ maxRetries config")

  // Timeout
  const clientWithTimeout = new Supermemory({ timeout: 20 * 1000 })
  console.log("✓ timeout config")

  // Per-request options
  await client.add({ content: "Test - " + Date.now() }, { maxRetries: 5, timeout: 5000 })
  console.log("✓ per-request options")
}

async function testRawResponse() {
  console.log("\n=== Raw Response ===")

  const response = await client.documents
    .add({ content: "Test - " + Date.now() })
    .asResponse()
  console.log("✓ .asResponse() status:", response.status)

  const { data, response: raw } = await client.documents
    .add({ content: "Test - " + Date.now() })
    .withResponse()
  console.log("✓ .withResponse() data:", data.id, "status:", raw.status)
}

async function testTypes() {
  console.log("\n=== Types ===")

  const params: Supermemory.AddParams = {
    content: "Typed content",
  }
  const response: Supermemory.AddResponse = await client.add(params)
  console.log("✓ TypeScript types work:", response.id)
}

async function testErrorHandling() {
  console.log("\n=== Error Handling ===")

  const response = await client.documents
    .add({ content: "Test - " + Date.now() })
    .catch(async (err) => {
      if (err instanceof Supermemory.APIError) {
        console.log("Caught APIError:", err.status, err.name)
      } else {
        throw err
      }
      return null
    })
  console.log("✓ Error handling pattern works:", response?.id)
}

async function main() {
  console.log("TypeScript SDK Tests")
  console.log("====================")

  await testDocumentsCRUD()
  await testBatchOperations()
  await testSearch()
  await testFileUploads()
  await testClientConfig()
  await testRawResponse()
  await testTypes()
  await testErrorHandling()

  console.log("\n====================")
  console.log("✅ All TypeScript SDK tests passed!")
}

main().catch(console.error)
