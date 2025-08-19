"use client";

import { cn } from "@repo/lib/utils";
import { Button } from "@repo/ui/components/button";
import { GlassMenuEffect } from "@repo/ui/other/glass-effect";
import { Move, ZoomIn, ZoomOut } from "lucide-react";
import { memo } from "react";
import type { ControlsProps } from "./types";

export const Controls = memo<ControlsProps>(
	({ onZoomIn, onZoomOut, onResetView, variant = "console" }) => {
		// Use explicit classes - controls positioning not defined in constants
		// Using a reasonable default position
		const getPositioningClasses = () => {
			if (variant === "console") {
				return "bottom-4 left-4";
			}
			if (variant === "consumer") {
				return "bottom-20 right-4";
			}
			return "";
		};

		return (
			<div
				className={cn(
					"absolute z-10 rounded-xl overflow-hidden",
					getPositioningClasses(),
				)}
			>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="rounded-xl" />

				<div className="relative z-10 px-4 py-3">
					<div className="flex items-center gap-2">
						<Button
							className="h-8 w-8 p-0 text-slate-200 hover:bg-slate-700/40 hover:text-slate-100 transition-colors"
							onClick={onZoomIn}
							size="sm"
							variant="ghost"
						>
							<ZoomIn className="w-4 h-4" />
						</Button>
						<Button
							className="h-8 w-8 p-0 text-slate-200 hover:bg-slate-700/40 hover:text-slate-100 transition-colors"
							onClick={onZoomOut}
							size="sm"
							variant="ghost"
						>
							<ZoomOut className="w-4 h-4" />
						</Button>
						<Button
							className="h-8 w-8 p-0 text-slate-200 hover:bg-slate-700/40 hover:text-slate-100 transition-colors"
							onClick={onResetView}
							size="sm"
							variant="ghost"
						>
							<Move className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>
		);
	},
);

Controls.displayName = "Controls";
