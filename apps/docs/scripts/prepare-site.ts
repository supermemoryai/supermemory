import { cp, mkdir, readdir } from "node:fs/promises"
import { resolve } from "node:path"
import apiPaths from "./api-paths.json"

const root = resolve(import.meta.dir, "..")
const publicDir = resolve(root, ".holocron-public")
await mkdir(publicDir, { recursive: true })
for (const name of ["images", "icons", "logo", "videos"]) {
	await cp(resolve(root, name), resolve(publicDir, name), { recursive: true })
}
for (const name of await readdir(root)) {
	if (name.startsWith("favicon") && name.endsWith(".png")) {
		await cp(resolve(root, name), resolve(publicDir, name))
	}
}

const response = await fetch("https://api.supermemory.ai/v4/openapi", {
	signal: AbortSignal.timeout(30_000),
})
if (!response.ok) throw new Error(`OpenAPI download failed: ${response.status}`)
const spec = (await response.json()) as {
	paths: Record<string, Record<string, Record<string, unknown>>>
	components: { schemas: Record<string, Record<string, unknown>> }
}
if (!spec.paths || !Object.keys(spec.paths).length) {
	throw new Error("OpenAPI specification has no paths")
}
for (const [operation, href] of Object.entries(apiPaths)) {
	const [method, path] = operation.split(" ")
	const definition = spec.paths[path]?.[method.toLowerCase()]
	if (!definition) throw new Error(`Missing documented operation: ${operation}`)
	definition["x-holocron"] = { href }
}
await Bun.write(resolve(publicDir, "openapi.json"), JSON.stringify(spec))

function expandSchemaReferences(
	value: unknown,
	references: string[] = [],
): unknown {
	if (Array.isArray(value))
		return value.map((item) => expandSchemaReferences(item, references))
	if (value === null || typeof value !== "object") return value
	const object = value as Record<string, unknown>
	if (
		typeof object.$ref === "string" &&
		object.$ref.startsWith("#/components/schemas/")
	) {
		const name = object.$ref.slice("#/components/schemas/".length)
		const schema = spec.components.schemas[name]
		if (!schema) throw new Error(`Unknown schema reference: ${object.$ref}`)
		if (references.includes(name)) {
			return {
				type: "object",
				title: name,
				description: `Recursive ${name}: accepts nested instances of the same schema. See the filtering guide for nested AND/OR examples. The complete recursive schema is available in /docs/openapi.json.`,
			}
		}
		return expandSchemaReferences(
			{
				...schema,
				...Object.fromEntries(
					Object.entries(object).filter(([key]) => key !== "$ref"),
				),
			},
			[...references, name],
		)
	}
	return Object.fromEntries(
		Object.entries(object).map(([key, item]) => [
			key,
			expandSchemaReferences(item, references),
		]),
	)
}

await Bun.write(
	resolve(root, ".holocron-openapi.json"),
	JSON.stringify(expandSchemaReferences(spec)),
)
