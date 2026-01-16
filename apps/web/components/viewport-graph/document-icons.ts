/**
 * Canvas-based document type icon rendering utilities
 * Simplified to match supported file types: PDF, TXT, MD, DOCX, DOC, RTF, CSV, JSON
 */

export type DocumentIconType =
	| "text"
	| "pdf"
	| "md"
	| "markdown"
	| "docx"
	| "doc"
	| "rtf"
	| "csv"
	| "json"

export function drawDocumentIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	type: string,
	color = "rgba(255, 255, 255, 0.9)",
): void {
	ctx.save()
	ctx.fillStyle = color
	ctx.strokeStyle = color
	ctx.lineWidth = Math.max(1, size / 12)
	ctx.lineCap = "round"
	ctx.lineJoin = "round"

	switch (type) {
		case "pdf":
			drawPdfIcon(ctx, x, y, size)
			break
		case "md":
		case "markdown":
			drawMarkdownIcon(ctx, x, y, size)
			break
		case "doc":
		case "docx":
			drawWordIcon(ctx, x, y, size)
			break
		case "rtf":
			drawRtfIcon(ctx, x, y, size)
			break
		case "csv":
			drawCsvIcon(ctx, x, y, size)
			break
		case "json":
			drawJsonIcon(ctx, x, y, size)
			break
		case "txt":
		case "text":
		default:
			drawTextIcon(ctx, x, y, size)
			break
	}

	ctx.restore()
}

function drawTextIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85
	const cornerFold = size * 0.2

	ctx.beginPath()
	ctx.moveTo(x - w / 2, y - h / 2)
	ctx.lineTo(x + w / 2 - cornerFold, y - h / 2)
	ctx.lineTo(x + w / 2, y - h / 2 + cornerFold)
	ctx.lineTo(x + w / 2, y + h / 2)
	ctx.lineTo(x - w / 2, y + h / 2)
	ctx.closePath()
	ctx.stroke()

	const lineSpacing = size * 0.15
	const lineWidth = size * 0.4
	ctx.beginPath()
	ctx.moveTo(x - lineWidth / 2, y - lineSpacing)
	ctx.lineTo(x + lineWidth / 2, y - lineSpacing)
	ctx.moveTo(x - lineWidth / 2, y)
	ctx.lineTo(x + lineWidth / 2, y)
	ctx.moveTo(x - lineWidth / 2, y + lineSpacing)
	ctx.lineTo(x + lineWidth / 2, y + lineSpacing)
	ctx.stroke()
}

function drawPdfIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85

	ctx.beginPath()
	ctx.rect(x - w / 2, y - h / 2, w, h)
	ctx.stroke()

	ctx.font = `bold ${size * 0.35}px sans-serif`
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText("PDF", x, y)
}

function drawMarkdownIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85

	ctx.beginPath()
	ctx.rect(x - w / 2, y - h / 2, w, h)
	ctx.stroke()

	ctx.font = `bold ${size * 0.3}px sans-serif`
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText("MD", x, y)
}

function drawWordIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85

	ctx.beginPath()
	ctx.rect(x - w / 2, y - h / 2, w, h)
	ctx.stroke()

	ctx.font = `bold ${size * 0.28}px sans-serif`
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText("DOC", x, y)
}

function drawRtfIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85

	ctx.beginPath()
	ctx.rect(x - w / 2, y - h / 2, w, h)
	ctx.stroke()

	ctx.font = `bold ${size * 0.3}px sans-serif`
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText("RTF", x, y)
}

function drawCsvIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85

	ctx.strokeRect(x - w / 2, y - h / 2, w, h)

	ctx.beginPath()
	ctx.moveTo(x, y - h / 2)
	ctx.lineTo(x, y + h / 2)
	ctx.moveTo(x - w / 2, y)
	ctx.lineTo(x + w / 2, y)
	ctx.stroke()
}

function drawJsonIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.6
	const h = size * 0.8

	ctx.beginPath()
	ctx.moveTo(x - w / 4, y - h / 2)
	ctx.quadraticCurveTo(x - w / 2, y - h / 3, x - w / 2, y)
	ctx.quadraticCurveTo(x - w / 2, y + h / 3, x - w / 4, y + h / 2)
	ctx.stroke()

	ctx.beginPath()
	ctx.moveTo(x + w / 4, y - h / 2)
	ctx.quadraticCurveTo(x + w / 2, y - h / 3, x + w / 2, y)
	ctx.quadraticCurveTo(x + w / 2, y + h / 3, x + w / 4, y + h / 2)
	ctx.stroke()
}
