import { memo, useMemo } from "react"
import DOMPurify from "dompurify"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"

interface HTMLContentRendererProps {
	content: string
	className?: string
}

/**
 * Detects if content is likely HTML based on common HTML patterns
 */
const isHTMLContent = (content: string): boolean => {
	// Check for HTML tags, entities, and DOCTYPE
	const htmlPatterns = [
		/<[a-z][\s\S]*>/i, // HTML tags
		/&[a-z]+;/i, // HTML entities
		/<!doctype\s+html/i, // DOCTYPE declaration
		/<\/[a-z]+>/i, // Closing tags
	]

	return htmlPatterns.some((pattern) => pattern.test(content))
}

export const HTMLContentRenderer = memo(
	({ content, className = "" }: HTMLContentRendererProps) => {
		const { isHTML, isMarkdown, processedContent } = useMemo(() => {
			const contentIsHTML = isHTMLContent(content)

			if (contentIsHTML) {
				return {
					isHTML: true,
					isMarkdown: false,
					processedContent: DOMPurify.sanitize(content),
				}
			}

			let processed = content

			if (content.includes("\n$ ")) {
				processed = content.replace(/^\$ (.*$)/gm, "```bash\n$ $1\n```")
			}

			if (
				content.trim().startsWith("{") &&
				content.includes('"') &&
				content.includes(":")
			) {
				const lines = content.split("\n")
				let inJsonBlock = false
				const jsonLines: string[] = []
				const otherLines: string[] = []

				for (const line of lines) {
					if (line.trim() === "{" || line.trim() === "[") {
						inJsonBlock = true
					}

					if (inJsonBlock) {
						jsonLines.push(line)
						if (line.trim() === "}" || line.trim() === "]") {
							inJsonBlock = false
						}
					} else {
						otherLines.push(line)
					}
				}

				if (jsonLines.length > 0 && jsonLines.join("\n").trim()) {
					const jsonBlock = jsonLines.join("\n")
					const otherContent = otherLines.join("\n")
					processed =
						otherContent +
						(otherContent ? "\n\n" : "") +
						"```json\n" +
						jsonBlock +
						"\n```"
				}
			}

			return {
				isHTML: false,
				isMarkdown: true,
				processedContent: processed,
			}
		}, [content])

		if (isHTML) {
			return (
				<div
					className={`${className} bg-background`}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
					dangerouslySetInnerHTML={{ __html: processedContent }}
				/>
			)
		}

		if (isMarkdown) {
			try {
				const components: Components = {
					h1: ({ children }) => (
						<h1 className="text-foreground text-lg font-semibold mb-1.5">
							{children}
						</h1>
					),
					h2: ({ children }) => (
						<h2 className="text-foreground text-base font-semibold mb-1.5">
							{children}
						</h2>
					),
					h3: ({ children }) => (
						<h3 className="text-foreground text-sm font-semibold mb-1">
							{children}
						</h3>
					),
					h4: ({ children }) => (
						<h4 className="text-foreground text-sm font-medium mb-1">
							{children}
						</h4>
					),
					h5: ({ children }) => (
						<h5 className="text-foreground text-sm font-medium mb-1">
							{children}
						</h5>
					),
					h6: ({ children }) => (
						<h6 className="text-foreground text-sm font-medium mb-1">
							{children}
						</h6>
					),
					p: ({ children }) => (
						<p className="text-foreground text-sm leading-relaxed mb-1.5">
							{children}
						</p>
					),
					strong: ({ children }) => (
						<strong className="text-foreground font-semibold">
							{children}
						</strong>
					),
					em: ({ children }) => (
						<em className="text-foreground italic">{children}</em>
					),
					code: ({ children, className }) => (
						<code
							className={`text-foreground bg-muted px-1.5 py-0.5 rounded text-xs font-mono ${className || ""}`}
						>
							{children}
						</code>
					),
					pre: ({ children }) => (
						<pre className="text-foreground bg-muted border border-border p-2 rounded text-xs overflow-x-auto mb-2 whitespace-pre font-mono leading-tight">
							{children}
						</pre>
					),
					blockquote: ({ children }) => (
						<blockquote className="text-muted-foreground border-l-4 border-muted-foreground pl-3 italic mb-2">
							{children}
						</blockquote>
					),
					a: ({ children, href }) => (
						<a
							href={href}
							className="text-primary hover:text-primary/80 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							{children}
						</a>
					),
					ul: ({ children }) => (
						<ul className="text-foreground text-sm mb-2 ml-4 list-disc">
							{children}
						</ul>
					),
					ol: ({ children }) => (
						<ol className="text-foreground text-sm mb-2 ml-4 list-decimal">
							{children}
						</ol>
					),
					li: ({ children }) => <li className="mb-1">{children}</li>,
				}

				return (
					<div className={`${className} bg-background`}>
						<ReactMarkdown components={components}>
							{processedContent}
						</ReactMarkdown>
					</div>
				)
			} catch {
				return (
					<p
						className={`text-sm leading-relaxed whitespace-pre-wrap text-foreground ${className}`}
					>
						{processedContent}
					</p>
				)
			}
		}
	},
)

HTMLContentRenderer.displayName = "HTMLContentRenderer"
