import { defineConfig } from "tsdown"

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node18",
    banner: {
        js: "#!/usr/bin/env node",
    },
})
