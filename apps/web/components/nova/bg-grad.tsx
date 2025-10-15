"use client"

interface BgGradProps {
	size?: number
	className?: string
}

function BgGrad({ size = 400, className = "" }: BgGradProps) {
	return (
		<div
			className={`relative ${className}`}
			data-name="bg-grad"
			style={{ width: `${size}px`, height: `${size}px` }}
		>
			{/* Large blue orb - right */}
			<div
				className="absolute bg-[#1410ff] filter rounded-full z-0"
				style={{
					height: `${(341.891 * size) / 400}px`,
					left: `${(161.86 * size) / 400}px`,
					top: `${(13.1 * size) / 400}px`,
					width: `${(204.976 * size) / 400}px`,
					filter: `blur(${(22.836 * size) / 400}px)`,
				}}
				data-name="4"
			/>

			{/* Large blue orb - left */}
			<div
				className="absolute bg-[#1410ff] filter rounded-full z-0"
				style={{
					height: `${(341.891 * size) / 400}px`,
					left: `${(17.16 * size) / 400}px`,
					top: `${(-0.01 * size) / 400}px`,
					width: `${(204.976 * size) / 400}px`,
					filter: `blur(${(22.836 * size) / 400}px)`,
				}}
				data-name="4"
			/>

			{/* Rotated blue orb - top left */}
			<div
				className="absolute flex items-center justify-center z-10"
				style={{
					height: `${(163.918 * size) / 400}px`,
					left: `${(12.75 * size) / 400}px`,
					top: `${(70.19 * size) / 400}px`,
					width: `${(345.985 * size) / 400}px`,
				}}
			>
				<div className="flex-none rotate-[11.06deg]">
					<div
						className="bg-[#0090ff] filter rounded-full"
						style={{
							height: `${(163.918 * size) / 400}px`,
							width: `${(345.985 * size) / 400}px`,
							filter: `blur(${(17.127 * size) / 400}px)`,
						}}
						data-name="3"
					/>
				</div>
			</div>

			{/* Rotated blue orb - top right */}
			<div
				className="absolute flex items-center justify-center z-20"
				style={{
					height: `${(103.099 * size) / 400}px`,
					left: `${(195 * size) / 400}px`,
					top: `${(84.54 * size) / 400}px`,
					width: `${(159.018 * size) / 400}px`,
				}}
			>
				<div className="flex-none rotate-[32.89deg]">
					<div
						className="bg-[#0099ff] filter rounded-full"
						style={{
							height: `${(103.099 * size) / 400}px`,
							width: `${(159.018 * size) / 400}px`,
							filter: `blur(${(14.273 * size) / 400}px)`,
						}}
						data-name="2"
					/>
				</div>
			</div>

			{/* Rotated blue orb - bottom left */}
			<div
				className="absolute flex items-center justify-center z-20"
				style={{
					height: `${(103.099 * size) / 400}px`,
					left: "0px",
					top: `${(81.05 * size) / 400}px`,
					width: `${(159.018 * size) / 400}px`,
				}}
			>
				<div className="flex-none rotate-[147.11deg]">
					<div
						className="bg-[#0099ff] filter rounded-full"
						style={{
							height: `${(103.099 * size) / 400}px`,
							width: `${(159.018 * size) / 400}px`,
							filter: `blur(${(14.273 * size) / 400}px)`,
						}}
						data-name="2"
					/>
				</div>
			</div>

			{/* Central rotated orb */}
			<div
				className="absolute flex items-center justify-center z-30"
				style={{
					height: `${(220.17 * size) / 400}px`,
					left: `${(85.76 * size) / 400}px`,
					top: `${(110.88 * size) / 400}px`,
					width: `${(216.8 * size) / 400}px`,
				}}
			>
				<div className="flex-none rotate-[180deg]">
					<div
						className="filter rounded-full"
						style={{
							height: `${(220.17 * size) / 400}px`,
							width: `${(216.8 * size) / 400}px`,
							filter: `blur(${(8.564 * size) / 400}px)`,
							background: "linear-gradient(186deg, #FFF 4.91%, #124DFF 61.9%)",
						}}
						data-name="1"
					/>
				</div>
			</div>

			{/* Bottom blue orb */}
			<div
				className="absolute bg-[#47a8fd] filter rounded-full z-40"
				style={{
					height: `${(74.371 * size) / 400}px`,
					left: `${(103.05 * size) / 400}px`,
					top: `${(228.82 * size) / 400}px`,
					width: `${(153.608 * size) / 400}px`,
					filter: `blur(${(17.127 * size) / 400}px)`,
				}}
				data-name="0"
			/>
		</div>
	)
}

export default BgGrad
