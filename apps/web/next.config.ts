import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	poweredByHeader: false,
	skipTrailingSlashRedirect: true,
	agentRules: false,
}

export default nextConfig

initOpenNextCloudflareForDev()
