import {
	glassMenuContainer,
	glassMenuEffect,
} from "./glass-effect.css";

interface GlassMenuEffectProps {
	rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
	className?: string;
}

export function GlassMenuEffect({
	rounded = "3xl",
	className = "",
}: GlassMenuEffectProps) {
	return (
		<div className={`${glassMenuContainer} ${className}`}>
			{/* Frosted glass effect with translucent border */}
			<div className={glassMenuEffect({ rounded })} />
		</div>
	);
}
