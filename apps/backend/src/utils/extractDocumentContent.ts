import * as mammoth from "mammoth";
import { NonRetryableError } from "cloudflare:workflows";
import { resolvePDFJS } from 'pdfjs-serverless';

interface DocumentContent {
  content: string;
  error?: string;
}

export const extractDocumentContent = async (
  url: string
): Promise<DocumentContent> => {
  try {
    const fileExtension = url.split(".").pop()?.toLowerCase();

    if (!fileExtension) {
      throw new Error("Invalid file URL");
    }

    console.log("file", fileExtension);

    switch (fileExtension) {
      case "pdf":
        return await extractPdfContent(url);
      case "md":
      case "txt":
        return await extractTextContent(url);
      case "doc":
      case "docx":
        return await extractWordContent(url);
      default:
        throw new NonRetryableError(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    return {
      content: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

async function extractPdfContent(url: string): Promise<DocumentContent> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Initialize PDF.js with serverless compatibility
    const { getDocument } = await resolvePDFJS();
    
    // Load the PDF document
    const pdf = await getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    }).promise;

    let fullText = "";

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return { content: fullText };
  } catch (error) {
    console.error("Error extracting PDF content:", error);
    return {
      content: "",
      error: error instanceof Error ? error.message : "Failed to extract PDF content",
    };
  }
}

async function extractTextContent(url: string): Promise<DocumentContent> {
  const response = await fetch(url);
  const text = await response.text();
  return { content: text };
}

async function extractWordContent(url: string): Promise<DocumentContent> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return { content: result.value };
}
