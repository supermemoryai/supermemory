export const models = [
	{
		id: "gpt-5",
		name: "GPT 5",
		description: "OpenAI's latest model",
	},
	{
		id: "claude-sonnet-4.5",
		name: "Claude Sonnet 4.5",
		description: "Anthropic's advanced model",
	},
	{
		id: "gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		description: "Google's most capable model",
	},
] as const

export type ModelId = (typeof models)[number]["id"]

export const modelNames: Record<ModelId, string> = {
	"gpt-5": "GPT 5",
	"claude-sonnet-4.5": "Claude Sonnet 4.5",
	"gemini-2.5-pro": "Gemini 2.5 Pro",
}

interface ModelIconProps {
	width?: number
	height?: number
	className?: string
}

export function ModelIcon({
	width = 24,
	height = 24,
	className,
}: ModelIconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			fill="none"
			viewBox="0 0 24 24"
			className={className}
			aria-label="Model icon"
		>
			<title>Model icon</title>
			<g
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
				clipPath="url(#clip0_4418_9868)"
			>
				<path d="m12.92 2.26 6.51 3.51c.76.41.76 1.58 0 1.99l-6.51 3.51c-.58.31-1.26.31-1.84 0L4.57 7.76c-.76-.41-.76-1.58 0-1.99l6.51-3.51c.58-.31 1.26-.31 1.84 0M3.61 10.13l6.05 3.03c.75.38 1.23 1.15 1.23 1.99v5.72c0 .83-.87 1.36-1.61.99l-6.05-3.03A2.24 2.24 0 0 1 2 16.84v-5.72c0-.83.87-1.36 1.61-.99M20.39 10.13l-6.05 3.03c-.75.38-1.23 1.15-1.23 1.99v5.72c0 .83.87 1.36 1.61.99l6.05-3.03c.75-.38 1.23-1.15 1.23-1.99v-5.72c0-.83.87-1.36-1.61-.99" />
			</g>
			<defs>
				<clipPath id="clip0_4418_9868">
					<path fill="#fff" d="M0 0h24v24H0z" />
				</clipPath>
			</defs>
		</svg>
	)
}
