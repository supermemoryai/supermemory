import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	// Tauri serves a static bundle from disk — there is no Node server at runtime,
	// so the app is exported to plain HTML/JS/CSS in ./out.
	output: "export",
	// The static export has no server-side image optimizer.
	images: { unoptimized: true },
	// Emit `route/index.html` files so the webview can resolve nested routes
	// (e.g. /spotlight) directly from the bundled filesystem.
	trailingSlash: true,
}

export default nextConfig
