import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

export default defineCloudflareConfig({
	incrementalCache: staticAssetsIncrementalCache,
})
