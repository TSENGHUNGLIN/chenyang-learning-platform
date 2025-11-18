import mammoth from "mammoth";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const pdfPath = path.join(tmpDir, `temp-${timestamp}.pdf`);
  const txtPath = path.join(tmpDir, `temp-${timestamp}.txt`);

  try {
    // Write buffer to temporary PDF file
    await writeFile(pdfPath, buffer);

    // Use pdftotext command to extract text
    await execAsync(`pdftotext "${pdfPath}" "${txtPath}"`);

    // Read extracted text
    const fs = await import("fs/promises");
    const text = await fs.readFile(txtPath, "utf-8");

    // Clean up temporary files
    await unlink(pdfPath).catch(() => {});
    await unlink(txtPath).catch(() => {});

    return text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    // Clean up on error
    await unlink(pdfPath).catch(() => {});
    await unlink(txtPath).catch(() => {});
    return "";
  }
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

