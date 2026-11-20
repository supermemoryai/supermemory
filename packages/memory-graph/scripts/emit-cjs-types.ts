/**
 * Emits CommonJS declaration files (.d.cts) alongside the ESM declarations
 * (.d.ts) produced by tsc. The package ships both ESM and CJS builds, so each
 * format needs matching declarations; otherwise TypeScript resolves `require`
 * imports to the ESM declarations and reports a module-kind mismatch.
 *
 * Relative specifiers are rewritten from `.js` to `.cjs` so that they resolve
 * to the sibling `.d.cts` files under Node16/NodeNext resolution.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const distDir = join(import.meta.dirname, "..", "dist")

function collectDeclarationFiles(dir: string): string[] {
	const files: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...collectDeclarationFiles(path))
		} else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
			files.push(path)
		}
	}
	return files
}

let emitted = 0

for (const declarationFile of collectDeclarationFiles(distDir)) {
	const cjsDeclarationFile = declarationFile.replace(/\.d\.ts$/, ".d.cts")
	const contents = readFileSync(declarationFile, "utf8").replace(
		/(\bfrom\s*["']|\bimport\s*\(\s*["'])(\.[^"']+)\.js(["'])/g,
		"$1$2.cjs$3",
	)
	writeFileSync(cjsDeclarationFile, contents)
	emitted++
}

console.log(`Emitted ${emitted} CommonJS declaration files`)
