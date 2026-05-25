export function SpaceFolderIcon({
	size = 16,
	className,
}: {
	size?: number
	className?: string
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			aria-hidden
		>
			<title>Space</title>
			{/* paper tab peeking above the folder */}
			<rect x="7" y="3.2" width="10" height="5" rx="1.6" fill="#F5C518" />
			{/* folder back with tab */}
			<path
				d="M2.6 8.8a2 2 0 0 1 2-2h4.2a2 2 0 0 1 1.5.68l1 1.13a2 2 0 0 0 1.5.69h6.6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2Z"
				fill="#161D29"
				stroke="#3C4658"
				strokeWidth="1.3"
			/>
			{/* lighter front flap for depth */}
			<path
				d="M2.6 11.6h18.8V17a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2Z"
				fill="#27313F"
			/>
		</svg>
	)
}
