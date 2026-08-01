import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { build } from "vite"
import { WIDGET_RESOURCE_META } from "../src/server/widget-resource-metadata"

const appRoot = fileURLToPath(new URL("../", import.meta.url))
const htmlUrl = new URL("../dist/src/widget/index.html", import.meta.url)
const manifestUrl = new URL("../dist/widget-manifest.json", import.meta.url)
const artifactsUrl = new URL("../dist/widgets/", import.meta.url)

await build({
	configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
	root: appRoot,
})

const html = await readFile(htmlUrl, "utf8")
const sha256 = createHash("sha256")
	.update(JSON.stringify({ html, meta: WIDGET_RESOURCE_META }))
	.digest("hex")
const resourceUri = `ui://supermemory/app-${sha256}.html`
const manifest = { resourceUri, sha256 }

await mkdir(artifactsUrl, { recursive: true })
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(
	new URL(`${sha256}.json`, artifactsUrl),
	`${JSON.stringify({ ...manifest, html, meta: WIDGET_RESOURCE_META })}\n`,
)
