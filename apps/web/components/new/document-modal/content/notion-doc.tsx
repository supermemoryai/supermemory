import { Streamdown } from "streamdown"

export function NotionDoc({ content }: { content: string }) {
	return (
		<div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
			<Streamdown>{content}</Streamdown>
		</div>
	)
}