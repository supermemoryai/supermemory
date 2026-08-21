import { describe, expect, it } from "bun:test"
import {
	isAcceptedFile,
	isAcceptedFileType,
	MAX_DOCUMENT_FILE_BYTES,
} from "./document-file-validation"

function createMockFile(name: string, size = 1024, type = ""): File {
	return new File([new Uint8Array(size)], name, { type })
}

describe("document file validation", () => {
	it("accepts standard documents by extension", () => {
		expect(isAcceptedFile(createMockFile("document.pdf"))).toBe(true)
		expect(isAcceptedFile(createMockFile("notes.md"))).toBe(true)
		expect(isAcceptedFile(createMockFile("data.json"))).toBe(true)
		expect(isAcceptedFile(createMockFile("sheet.xlsx"))).toBe(true)
		expect(isAcceptedFile(createMockFile("report.docx"))).toBe(true)
		expect(isAcceptedFile(createMockFile("data.csv"))).toBe(true)
	})

	it("accepts files with uppercase extensions and multi-dot filenames", () => {
		expect(isAcceptedFile(createMockFile("DOCUMENT.PDF"))).toBe(true)
		expect(isAcceptedFile(createMockFile("archive.v1.0.final.docx"))).toBe(true)
		expect(isAcceptedFile(createMockFile("report.2026.08.19.csv"))).toBe(true)
	})

	it("accepts extensionless or generic files matching valid MIME types", () => {
		expect(
			isAcceptedFile(createMockFile("blob", 1024, "application/pdf")),
		).toBe(true)
		expect(
			isAcceptedFile(createMockFile("uploaded-file", 1024, "application/json")),
		).toBe(true)
		expect(
			isAcceptedFile(createMockFile("image-upload", 1024, "image/png")),
		).toBe(true)
		expect(isAcceptedFile(createMockFile("photo", 1024, "image/jpeg"))).toBe(
			true,
		)
	})

	it("correctly evaluates isAcceptedFileType independent of file size", () => {
		expect(isAcceptedFileType(createMockFile("empty.pdf", 0))).toBe(true)
		expect(
			isAcceptedFileType(
				createMockFile("large.pdf", MAX_DOCUMENT_FILE_BYTES + 1),
			),
		).toBe(true)
		expect(isAcceptedFileType(createMockFile("script.sh"))).toBe(false)
	})

	it("rejects files exceeding the 50MB limit in isAcceptedFile", () => {
		const oversized = MAX_DOCUMENT_FILE_BYTES + 1
		expect(isAcceptedFile(createMockFile("large.pdf", oversized))).toBe(false)
	})

	it("rejects empty files with 0 bytes in isAcceptedFile", () => {
		expect(isAcceptedFile(createMockFile("empty.pdf", 0))).toBe(false)
	})

	it("rejects unsupported extensions and executables", () => {
		expect(isAcceptedFile(createMockFile("malware.exe"))).toBe(false)
		expect(isAcceptedFile(createMockFile("script.sh"))).toBe(false)
		expect(isAcceptedFile(createMockFile("archive.zip"))).toBe(false)
		expect(isAcceptedFile(createMockFile("binary.bin"))).toBe(false)
	})
})
