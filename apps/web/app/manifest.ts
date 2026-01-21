import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Supermemory",
		short_name: "supermemory",
		description: "Your memories, wherever you are",
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#000000",
		icons: [
			{
				src: "/images/logo.png",
				sizes: "192x192",
				type: "image/png",
			},
		],
	}
}
