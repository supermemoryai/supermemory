interface GlassMenuEffectProps {
	rounded?: string;
	className?: string;
}

export function GlassMenuEffect({
	rounded = "rounded-3xl",
	className = "",
}: GlassMenuEffectProps) {
	return (
		<div className={`absolute inset-0 ${className}`}>
			{/* Frosted glass effect with translucent border */}
			<div
				className={`absolute inset-0 backdrop-blur-md bg-white/5 border border-white/10 ${rounded}`}
			/>
		</div>
	);
}
