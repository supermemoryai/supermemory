import { memo, useMemo } from "react"
import DOMPurify from "dompurify"

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
		const { isHTML, processedContent } = useMemo(() => {
			const contentIsHTML = isHTMLContent(content)

			if (contentIsHTML) {
				return {
					isHTML: true,
					processedContent: DOMPurify.sanitize(content),
				}
			}

			return {
				isHTML: false,
				processedContent: content,
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

		return (
			<p
				className={`text-sm leading-relaxed whitespace-pre-wrap text-foreground ${className}`}
			>
				{processedContent}
			</p>
		)
	},
)

HTMLContentRenderer.displayName = "HTMLContentRenderer"
