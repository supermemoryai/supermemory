import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	poweredByHeader: false,
	skipTrailingSlashRedirect: true,
}

export default nextConfig

initOpenNextCloudflareForDev()
