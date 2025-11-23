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

export async function extractTextFromCSV(buffer: Buffer): Promise<string> {
  try {
    // Convert buffer to string
    const csvText = buffer.toString("utf-8");
    
    // Parse CSV and convert to readable text format
    const lines = csvText.split("\n").filter(line => line.trim());
    
    if (lines.length === 0) {
      return "";
    }
    
    // Simple CSV parsing (handles basic cases)
    const rows = lines.map(line => {
      // Split by comma, handling quoted fields
      const fields: string[] = [];
      let currentField = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim());
      
      return fields;
    });
    
    // Convert to readable text format
    const header = rows[0];
    const dataRows = rows.slice(1);
    
    let text = "CSV檔案內容：\n\n";
    text += "欄位：" + header.join(", ") + "\n\n";
    
    dataRows.forEach((row, index) => {
      text += `第 ${index + 1} 筆資料：\n`;
      header.forEach((col, colIndex) => {
        if (row[colIndex]) {
          text += `  ${col}: ${row[colIndex]}\n`;
        }
      });
      text += "\n";
    });
    
    return text;
  } catch (error) {
    console.error("CSV extraction error:", error);
    return "";
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    throw new Error("系統不再支援PDF檔案上傳，請使用DOCX或CSV格式");
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractTextFromDOCX(buffer);
  } else if (mimeType === "text/csv" || mimeType === "application/csv") {
    return await extractTextFromCSV(buffer);
  }
  return "";
}

