import React from "react"
import { Streamdown } from "streamdown"

const components = {
	p: ({ children, ...props }: React.ComponentPropsWithoutRef<"p">) => {
		const hasDiv = React.Children.toArray(children).some(
			(child) =>
				React.isValidElement(child) &&
				typeof child.type === "string" &&
				child.type === "div",
		)

		if (hasDiv) {
			return <div {...props}>{children}</div>
		}

		return <p {...props}>{children}</p>
	},
} as const

export function WebPageContent({ content }: { content: string }) {
	return (
		<div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
			<Streamdown components={components}>{content}</Streamdown>
		</div>
	)
}
