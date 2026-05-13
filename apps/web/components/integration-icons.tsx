import Image from "next/image"
import { Rotate3d } from "lucide-react"

export { Rotate3d as GraphIcon }

export function IntegrationsIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 22 22"
			fill="none"
			className={className}
		>
			<title>Integrations</title>
			<path
				d="M15.67 18C16.95 18 18 16.96 18 15.67C18 14.38 16.95 13.34 15.67 13.34C14.38 13.34 13.33 14.38 13.33 15.67C13.33 16.96 14.38 18 15.67 18Z"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.33 8.67C7.62 8.67 8.67 7.62 8.67 6.33C8.67 5.04 7.62 4 6.33 4C5.04 4 4 5.04 4 6.33C4 7.62 5.04 8.67 6.33 8.67Z"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M11.78 6.34H14.11C14.52 6.34 14.92 6.5 15.21 6.79C15.5 7.08 15.67 7.48 15.67 7.89V13.34"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.33 8.66V18"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function ChromeIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			preserveAspectRatio="xMidYMid"
			viewBox="0 0 190.5 190.5"
			className={className}
		>
			<title>Google Chrome Icon</title>
			<path
				fill="#fff"
				d="M95.25 142.87c26.3 0 47.63-21.32 47.63-47.63s-21.32-47.63-47.63-47.63-47.63 21.32-47.63 47.63 21.32 47.63 47.63 47.63z"
			/>
			<path
				fill="#229342"
				d="m54.01 119.07-41.24-71.43a95.23 95.23 0 0 0-.003 95.25 95.23 95.23 0 0 0 82.5 47.61l41.24-71.43v-.011a47.61 47.61 0 0 1-17.43 17.44 47.62 47.62 0 0 1-47.63.007 47.62 47.62 0 0 1-17.43-17.44z"
			/>
			<path
				fill="#fbc116"
				d="m136.5 119.07-41.24 71.43a95.23 95.23 0 0 0 82.49-47.62A95.24 95.24 0 0 0 190.5 95.25a95.24 95.24 0 0 0-12.77-47.62H95.25l-.1.01a47.62 47.62 0 0 1 23.82 6.37 47.62 47.62 0 0 1 17.44 17.43 47.62 47.62 0 0 1-.001 47.63z"
			/>
			<path
				fill="#1a73e8"
				d="M95.25 132.96c20.82 0 37.7-16.88 37.7-37.71S116.08 57.55 95.25 57.55 57.55 74.43 57.55 95.25s16.88 37.71 37.7 37.71z"
			/>
			<path
				fill="#e33b2e"
				d="M95.25 47.63h82.48A95.24 95.24 0 0 0 142.87 12.76 95.23 95.23 0 0 0 95.25 0a95.22 95.22 0 0 0-47.62 12.77 95.23 95.23 0 0 0-34.86 34.87l41.24 71.43.01.006a47.62 47.62 0 0 1-.015-47.63 47.61 47.61 0 0 1 41.25-23.82z"
			/>
		</svg>
	)
}

export function AppleShortcutsIcon() {
	return (
		<div className="relative size-10 shrink-0 rounded-lg overflow-hidden">
			<Image
				src="/images/ios-shortcuts.png"
				alt="Apple Shortcuts"
				width={40}
				height={40}
				className="object-cover"
			/>
		</div>
	)
}

export function RaycastIcon({ className }: { className?: string }) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 28 28"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>Raycast Icon</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M7 18.08V21L0 14L1.46 12.54L7 18.08V18.08ZM9.92 21H7L14 28L15.46 26.54L9.92 21ZM26.54 15.46L28 14L14 0L12.54 1.47L18.08 7H14.73L10.86 3.15L9.4 4.61L11.81 7.01H10.13V17.88H20.99V16.2L23.4 18.6L24.86 17.14L20.99 13.27V9.93L26.54 15.46ZM7.73 6.28L6.26 7.74L7.83 9.3L9.29 7.84L7.73 6.28ZM20.16 18.71L18.7 20.17L20.27 21.74L21.73 20.28L20.16 18.71ZM4.6 9.41L3.13 10.87L7 14.74V11.81L4.6 9.41ZM16.19 21.01H13.27L17.13 24.87L18.6 23.41L16.19 21.01Z"
				fill="#FF6363"
			/>
		</svg>
	)
}
