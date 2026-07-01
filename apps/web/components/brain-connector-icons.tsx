import { cn } from "@lib/utils"
import { Granola, Notion } from "@ui/assets/icons"
import { dmSans125ClassName } from "@/lib/fonts"

export function SlackMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 122.8 122.8" className={className} aria-hidden="true">
			<title>Slack</title>
			<path
				d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z"
				fill="#E01E5A"
			/>
			<path
				d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
				fill="#E01E5A"
			/>
			<path
				d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z"
				fill="#36C5F0"
			/>
			<path
				d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
				fill="#36C5F0"
			/>
			<path
				d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z"
				fill="#2EB67D"
			/>
			<path
				d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
				fill="#2EB67D"
			/>
			<path
				d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z"
				fill="#ECB22E"
			/>
			<path
				d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
				fill="#ECB22E"
			/>
		</svg>
	)
}

function GithubMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<title>GitHub</title>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	)
}

function LinearMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<title>Linear</title>
			<path d="M3.084 12.866a8.916 8.916 0 0 0 8.05 8.05.27.27 0 0 0 .222-.46l-7.812-7.812a.27.27 0 0 0-.46.222Zm-.044-1.955a.27.27 0 0 0 .078.21l9.76 9.76c.06.06.142.087.21.078a8.87 8.87 0 0 0 1.273-.218.27.27 0 0 0 .127-.453L3.712 9.51a.27.27 0 0 0-.453.127 8.87 8.87 0 0 0-.218 1.273Zm.69-2.706a.27.27 0 0 0 .06.29l11.715 11.716a.27.27 0 0 0 .29.06 8.96 8.96 0 0 0 .837-.384.27.27 0 0 0 .066-.439L4.553 7.302a.27.27 0 0 0-.44.066 8.96 8.96 0 0 0-.383.837Zm1.11-1.798a.27.27 0 0 1-.017-.366A8.948 8.948 0 0 1 18.07 18.69a.27.27 0 0 1-.366-.017L4.94 6.407Z" />
		</svg>
	)
}

function SentryMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<title>Sentry</title>
			<path d="M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0L6.904 7.92a15.478 15.478 0 0 1 8.53 12.811h-2.221A13.301 13.301 0 0 0 5.784 9.814l-2.926 5.06a7.65 7.65 0 0 1 4.435 5.848H2.194a.365.365 0 0 1-.298-.534l1.413-2.402a5.16 5.16 0 0 0-1.614-.913L.296 19.275a2.182 2.182 0 0 0 .812 2.999 2.24 2.24 0 0 0 1.086.288h6.983a9.322 9.322 0 0 0-3.845-8.318l1.11-1.922a11.47 11.47 0 0 1 4.95 10.24h5.915a17.242 17.242 0 0 0-7.885-15.28l2.244-3.845a.37.37 0 0 1 .504-.13c.255.14 9.75 16.708 9.928 16.9a.365.365 0 0 1-.327.543h-2.287c.029.612.029 1.223 0 1.831h2.297a2.206 2.206 0 0 0 1.922-3.31z" />
		</svg>
	)
}

function PostHogMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<title>PostHog</title>
			<path d="M9.854 14.5 5 9.647.854 5.5A.5.5 0 0 0 0 5.854V8.44a.5.5 0 0 0 .146.353L5 13.647l.147.146L9.854 18.5l.146.147v-.049c.065.03.134.049.207.049h2.586a.5.5 0 0 0 .353-.854L9.854 14.5zm0-5-4-4a.487.487 0 0 0-.409-.144.515.515 0 0 0-.356.21.493.493 0 0 0-.089.288V8.44a.5.5 0 0 0 .147.353l9 9a.5.5 0 0 0 .853-.354v-2.585a.5.5 0 0 0-.146-.354l-5-5zm1-4a.5.5 0 0 0-.854.354V8.44a.5.5 0 0 0 .147.353l4 4a.5.5 0 0 0 .853-.354V9.854a.5.5 0 0 0-.146-.354l-4-4zm12.647 11.515a3.863 3.863 0 0 1-2.232-1.1l-4.708-4.707a.5.5 0 0 0-.854.354v6.585a.5.5 0 0 0 .5.5H23.5a.5.5 0 0 0 .5-.5v-.6c0-.276-.225-.497-.499-.532zm-5.394.032a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zM.854 15.5a.5.5 0 0 0-.854.354v2.293a.5.5 0 0 0 .5.5h2.293c.222 0 .39-.135.462-.309a.493.493 0 0 0-.109-.545L.854 15.501zM5 14.647.854 10.5a.5.5 0 0 0-.854.353v2.586a.5.5 0 0 0 .146.353L4.854 18.5l.146.147h2.793a.5.5 0 0 0 .353-.854L5 14.647z" />
		</svg>
	)
}

function LetterMark({ label, color }: { label: string; color: string }) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"flex size-full items-center justify-center rounded-[8px] text-[15px] font-bold text-white",
			)}
			style={{ background: color }}
		>
			{label.charAt(0).toUpperCase()}
		</span>
	)
}

// Real brand logos where we have them, a branded lettermark otherwise.
export function brainConnectorIcon(
	slug: string,
	name: string,
	className = "size-[18px]",
): React.ReactNode {
	switch (slug) {
		case "github":
			return <GithubMark className={cn(className, "text-[#FAFAFA]")} />
		case "linear":
			return <LinearMark className={cn(className, "text-[#5E6AD2]")} />
		case "slack":
			return <SlackMark className={className} />
		case "notion":
			return <Notion className={className} />
		case "granola":
			return <Granola className={className} />
		case "sentry":
			return <SentryMark className={cn(className, "text-[#FAFAFA]")} />
		case "posthog":
			return <PostHogMark className={cn(className, "text-[#F1A82C]")} />
		default:
			return <LetterMark label={name} color="#1E293B" />
	}
}
