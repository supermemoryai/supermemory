export function Loading() {
	return (
		<div className="mcp-widget-loading flex items-center justify-center py-(--space-12)">
			<output
				aria-label="Loading..."
				className="super-loader"
				style={{ ["--super-loader-size" as string]: "42px" }}
			>
				<svg
					aria-hidden="true"
					className="super-loader-mark"
					viewBox="0 0 21 21"
				>
					<path
						className="super-loader-path super-loader-path-right"
						d="M3.03472 6.05861L6.8539 9.91021H1.96777V11.9737H8.3006V17.4781H10.3467V11.5057C10.3467 10.8713 10.0963 10.2621 9.65119 9.81327L4.48145 4.59961L3.03472 6.05861Z"
						pathLength={1}
					/>
					<path
						className="super-loader-path super-loader-path-left"
						d="M12.6994 9.02793V3.52344H10.6533V9.49591C10.6533 10.1302 10.9037 10.7395 11.3488 11.1883L16.5197 16.4032L17.9665 14.9441L14.1473 11.0926H19.0334V9.02914L12.6994 9.02793Z"
						pathLength={1}
					/>
				</svg>
				<span className="super-loader-label">Loading...</span>
			</output>
		</div>
	)
}
