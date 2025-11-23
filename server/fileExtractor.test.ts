import { describe, it, expect } from "vitest";
import { extractTextFromFile } from "./fileExtractor";

describe("File Extractor - PDF Rejection", () => {
  it("should reject PDF files with error message", async () => {
    const pdfBuffer = Buffer.from("fake pdf content");
    const mimeType = "application/pdf";

    await expect(extractTextFromFile(pdfBuffer, mimeType)).rejects.toThrow(
      "系統不再支援PDF檔案上傳，請使用DOCX或CSV格式"
    );
  });

  it("should accept DOCX files", async () => {
    // 建立一個簡單的DOCX buffer（實際上是zip格式）
    // 這裡只測試不會拋出錯誤，不測試實際提取內容
    const docxBuffer = Buffer.from("fake docx content");
    const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // 應該不會拋出錯誤（即使提取失敗也會回傳空字串）
    const result = await extractTextFromFile(docxBuffer, mimeType);
    expect(typeof result).toBe("string");
  });

  it("should accept CSV files", async () => {
    const csvBuffer = Buffer.from("name,age\nAlice,30\nBob,25");
    const mimeType = "text/csv";

    const result = await extractTextFromFile(csvBuffer, mimeType);
    expect(typeof result).toBe("string");
    expect(result).toContain("name");
    expect(result).toContain("Alice");
  });
});

