/** biome-ignore-all lint/performance/noImgElement: Not Next.js environment */
import { ImageResponse } from "next/og"

export async function GET() {
	return new ImageResponse(
		<div tw="w-full h-full flex flex-col justify-center items-center">
			<img
				src="https://pub-1be2b1df2c7e456f8e21149e972f4caf.r2.dev/bust.png"
				alt="Google Logo"
				height={367}
				width={369}
			/>
		</div>,
		{
			width: 1200,
			height: 630,
		},
	)
}
