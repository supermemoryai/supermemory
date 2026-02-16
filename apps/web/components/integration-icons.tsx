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
				d="M15.6654 18.0026C16.954 18.0026 17.9987 16.9579 17.9987 15.6693C17.9987 14.3806 16.954 13.3359 15.6654 13.3359C14.3767 13.3359 13.332 14.3806 13.332 15.6693C13.332 16.9579 14.3767 18.0026 15.6654 18.0026Z"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.33333 8.66667C7.622 8.66667 8.66667 7.622 8.66667 6.33333C8.66667 5.04467 7.622 4 6.33333 4C5.04467 4 4 5.04467 4 6.33333C4 7.622 5.04467 8.66667 6.33333 8.66667Z"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M11.7773 6.33594H14.1107C14.5232 6.33594 14.9189 6.49983 15.2106 6.79155C15.5023 7.08327 15.6662 7.47893 15.6662 7.89149V13.3359"
				stroke="currentColor"
				strokeWidth="1.55556"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.33203 8.66406V17.9974"
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
				d="M95.252 142.873c26.304 0 47.627-21.324 47.627-47.628s-21.323-47.628-47.627-47.628-47.627 21.324-47.627 47.628 21.323 47.628 47.627 47.628z"
			/>
			<path
				fill="#229342"
				d="m54.005 119.07-41.24-71.43a95.227 95.227 0 0 0-.003 95.25 95.234 95.234 0 0 0 82.496 47.61l41.24-71.43v-.011a47.613 47.613 0 0 1-17.428 17.443 47.62 47.62 0 0 1-47.632.007 47.62 47.62 0 0 1-17.433-17.437z"
			/>
			<path
				fill="#fbc116"
				d="m136.495 119.067-41.239 71.43a95.229 95.229 0 0 0 82.489-47.622A95.24 95.24 0 0 0 190.5 95.248a95.237 95.237 0 0 0-12.772-47.623H95.249l-.01.007a47.62 47.62 0 0 1 23.819 6.372 47.618 47.618 0 0 1 17.439 17.431 47.62 47.62 0 0 1-.001 47.633z"
			/>
			<path
				fill="#1a73e8"
				d="M95.252 132.961c20.824 0 37.705-16.881 37.705-37.706S116.076 57.55 95.252 57.55 57.547 74.431 57.547 95.255s16.881 37.706 37.705 37.706z"
			/>
			<path
				fill="#e33b2e"
				d="M95.252 47.628h82.479A95.237 95.237 0 0 0 142.87 12.76 95.23 95.23 0 0 0 95.245 0a95.222 95.222 0 0 0-47.623 12.767 95.23 95.23 0 0 0-34.856 34.872l41.24 71.43.011.006a47.62 47.62 0 0 1-.015-47.633 47.61 47.61 0 0 1 41.252-23.815z"
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
				d="M7 18.079V21L0 14L1.46 12.54L7 18.081V18.079ZM9.921 21H7L14 28L15.46 26.54L9.921 21ZM26.535 15.462L27.996 14L13.996 0L12.538 1.466L18.077 7.004H14.73L10.864 3.146L9.404 4.606L11.809 7.01H10.129V17.876H20.994V16.196L23.399 18.6L24.859 17.14L20.994 13.274V9.927L26.535 15.462ZM7.73 6.276L6.265 7.738L7.833 9.304L9.294 7.844L7.73 6.276ZM20.162 18.708L18.702 20.17L20.268 21.738L21.73 20.276L20.162 18.708ZM4.596 9.41L3.134 10.872L7 14.738V11.815L4.596 9.41ZM16.192 21.006H13.268L17.134 24.872L18.596 23.41L16.192 21.006Z"
				fill="#FF6363"
			/>
		</svg>
	)
}
