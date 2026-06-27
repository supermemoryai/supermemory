import { readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "../../../..")

function readRepoFile(relativePath: string) {
	return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function assert(condition: unknown, message: string) {
	if (!condition) {
		throw new Error(message)
	}
}

const docsJson = JSON.parse(readRepoFile("apps/docs/docs.json"))
const embeddingDocs = readRepoFile(
	"apps/docs/self-hosting/embedding-models.mdx",
)
const configDocs = readRepoFile("apps/docs/self-hosting/configuration.mdx")
const quickstartDocs = readRepoFile("apps/docs/self-hosting/quickstart.mdx")

const selfHostingPages = docsJson.navigation.tabs[0].anchors[1].pages[1].pages

assert(
	selfHostingPages.includes("self-hosting/embedding-models"),
	"Self-hosting navigation should include the local embeddings page",
)

assert(
	embeddingDocs.includes("GitHub issue #1104") &&
		embeddingDocs.includes(
			"https://github.com/supermemoryai/supermemory/issues/1104",
		),
	"Local embeddings docs should link to the upstream multilingual issue",
)

assert(
	embeddingDocs.includes("BGE-M3") &&
		embeddingDocs.includes("more than 100 languages") &&
		embeddingDocs.includes("1024-dimensional"),
	"Local embeddings docs should explain the recommended multilingual model and dimension constraint",
)

assert(
	embeddingDocs.includes("do not expose a supported embedding-model selector"),
	"Local embeddings docs should state that current releases do not support model selection",
)

assert(
	configDocs.includes("[Local Embeddings](/self-hosting/embedding-models)"),
	"Configuration docs should link to local embedding guidance",
)

assert(
	quickstartDocs.includes("[Local Embeddings](/self-hosting/embedding-models)"),
	"Quickstart should direct multilingual users to local embedding guidance",
)

assert(
	!configDocs.includes("SUPERMEMORY_LOCAL_EMBEDDING_MODEL"),
	"Configuration docs must not document an unsupported embedding model env var as live config",
)

console.log("Self-hosting local embedding docs checks passed")
