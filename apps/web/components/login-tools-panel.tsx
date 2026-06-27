"use client"

import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import OrbitMemory from "@/components/orbit-memory"

function LoginPanelBackground() {
	return (
		<>
			<div
				className="pointer-events-none absolute inset-0 bg-[#030912]"
				aria-hidden
			/>
			<div className="login-panel-orb pointer-events-none" aria-hidden />
			<div className="login-panel-orb-image" aria-hidden />
			<div className="login-panel-orb-image-alt" aria-hidden />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1] opacity-[0.05]"
				style={{
					backgroundImage:
						'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27200%27%20height%3D%27200%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.9%27%20numOctaves%3D%272%27%20stitchTiles%3D%27stitch%27%2F%3E%3CfeColorMatrix%20type%3D%27saturate%27%20values%3D%270%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url%28%23n%29%27%2F%3E%3C%2Fsvg%3E")',
					backgroundSize: "200px 200px",
				}}
			/>
		</>
	)
}

export function LoginToolsPanel() {
	return (
		<aside className="relative hidden min-h-0 flex-col overflow-hidden border-white/[0.06] lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:border-r">
			<LoginPanelBackground />

			<div className="login-tools-panel-inner relative z-10 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
				<div className="h-full" style={{ aspectRatio: "780 / 1024" }}>
					{/* overflow:visible lets the core glow bleed and fade into the
				    panel instead of being hard-clipped at the orbit's box edge;
				    the panel's own overflow-hidden clips it softly at the edges */}
					<OrbitMemory
						style={{ background: "transparent", overflow: "visible" }}
						grain={false}
					/>
				</div>
			</div>

			<p
				className={cn(
					"relative z-10 shrink-0 px-4 pb-4 text-center text-[11px] leading-snug text-white/40 sm:px-8 sm:text-xs lg:absolute lg:bottom-6 lg:left-1/2 lg:max-w-none lg:-translate-x-1/2 lg:px-0 lg:pb-0 lg:text-sm lg:whitespace-nowrap lg:text-white/45",
					dmSansClassName(),
				)}
			>
				One memory layer — context from any tool, everywhere you need it.
			</p>
		</aside>
	)
}
