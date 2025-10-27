import mammoth from "mammoth";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // PDF text extraction is complex and requires additional setup
  // For now, return empty string and handle PDF processing separately
  // In production, consider using external services or command-line tools
  return "";
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return "";
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return await extractTextFromPDF(buffer);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractTextFromDOCX(buffer);
  }
  return "";
}

