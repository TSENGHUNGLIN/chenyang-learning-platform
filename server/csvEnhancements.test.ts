import { describe, it, expect } from "vitest";
import { detectEncoding, convertToUTF8 } from "./encodingDetector";
import { validateCSV, EMPLOYEE_IMPORT_RULES, EXAM_TEMPLATE_IMPORT_RULES } from "./csvValidator";
import { parseCSVForPreview } from "./csvPreview";

describe("CSV 編碼自動偵測功能", () => {
  it("應該正確偵測 UTF-8 編碼", () => {
    const content = "姓名,部門\n張三,設計部\n李四,工程部";
    const buffer = Buffer.from(content, "utf-8");
    const result = detectEncoding(buffer);

    expect(result.encoding).toBe("utf-8");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.content).toContain("張三");
  });

  it("應該正確偵測 UTF-8 BOM 編碼", () => {
    const content = "姓名,部門\n張三,設計部";
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const buffer = Buffer.concat([bom, Buffer.from(content, "utf-8")]);
    const result = detectEncoding(buffer);

    expect(result.encoding).toBe("utf-8");
    expect(result.confidence).toBe(100);
    expect(result.content).toContain("張三");
  });

  it("應該正確偵測 Big5 編碼", () => {
    const content = "姓名,部門\n張三,設計部";
    const iconv = require("iconv-lite");
    const buffer = iconv.encode(content, "big5");
    const result = detectEncoding(buffer);

    // Big5 編碼應該能被正確偵測
    expect(["big5", "utf-8"]).toContain(result.encoding);
    expect(result.content).toContain("姓名");
  });

  it("應該正確轉換為 UTF-8", () => {
    const content = "測試內容";
    const buffer = Buffer.from(content, "utf-8");
    const result = convertToUTF8(buffer);

    expect(result).toBe(content);
  });
});

describe("CSV 格式驗證功能", () => {
  it("應該通過有效的員工資料驗證", () => {
    const headers = ["姓名", "部門名稱", "電子郵件"];
    const rows = [
      ["張三", "設計部", "zhang@example.com"],
      ["李四", "工程部", "li@example.com"],
    ];

    const result = validateCSV(headers, rows, EMPLOYEE_IMPORT_RULES);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.validRows).toBe(2);
  });

  it("應該檢測缺少必要欄位", () => {
    const headers = ["姓名"]; // 缺少「部門名稱」
    const rows = [["張三"]];

    const result = validateCSV(headers, rows, EMPLOYEE_IMPORT_RULES);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("缺少必要欄位");
  });

  it("應該檢測無效的電子郵件格式", () => {
    const headers = ["姓名", "部門名稱", "電子郵件"];
    const rows = [["張三", "設計部", "invalid-email"]];

    const result = validateCSV(headers, rows, EMPLOYEE_IMPORT_RULES);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe("format");
  });

  it("應該檢測必填欄位為空", () => {
    const headers = ["姓名", "部門名稱"];
    const rows = [["", "設計部"]]; // 姓名為空

    const result = validateCSV(headers, rows, EMPLOYEE_IMPORT_RULES);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe("missing");
  });

  it("應該驗證考試範本資料格式", () => {
    const headers = ["題目", "題型", "難度", "正確答案", "分數"];
    const rows = [
      ["什麼是室內設計？", "問答題", "簡單", "室內設計是...", "10"],
      ["下列何者正確？", "選擇題", "中等", "A", "5"],
    ];

    const result = validateCSV(headers, rows, EXAM_TEMPLATE_IMPORT_RULES);

    expect(result.valid).toBe(true);
    expect(result.summary.validRows).toBe(2);
  });

  it("應該檢測無效的題型", () => {
    const headers = ["題目", "題型", "難度", "正確答案"];
    const rows = [["這是一個測試題目", "無效題型", "簡單", "答案"]];

    const result = validateCSV(headers, rows, EXAM_TEMPLATE_IMPORT_RULES);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // 檢查是否有 enum 類型的錯誤
    const hasEnumError = result.errors.some(e => e.type === "enum");
    expect(hasEnumError).toBe(true);
  });

  it("應該檢測分數範圍", () => {
    const headers = ["題目", "題型", "難度", "正確答案", "分數"];
    const rows = [["這是一個測試題目", "問答題", "簡單", "答案", "150"]]; // 分數超過 100

    const result = validateCSV(headers, rows, EXAM_TEMPLATE_IMPORT_RULES);

    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe("range");
  });
});

describe("CSV 預覽功能整合測試", () => {
  it("應該正確解析並預覽 CSV 檔案", async () => {
    const content = "姓名,部門,分數\n張三,設計部,85\n李四,工程部,92";
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100);

    expect(result.headers).toEqual(["姓名", "部門", "分數"]);
    expect(result.rows).toHaveLength(2);
    expect(result.totalRows).toBe(2);
    expect(result.totalColumns).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it("應該包含編碼偵測資訊", async () => {
    const content = "姓名,部門\n張三,設計部";
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100);

    expect(result.encoding).toBeDefined();
    expect(result.encodingConfidence).toBeDefined();
  });

  it("應該執行格式驗證（如果提供規則）", async () => {
    const content = "姓名,部門名稱,電子郵件\n張三,設計部,zhang@example.com";
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100, EMPLOYEE_IMPORT_RULES);

    expect(result.validation).toBeDefined();
    expect(result.validation?.valid).toBe(true);
  });

  it("應該限制預覽行數", async () => {
    const rows = Array.from({ length: 150 }, (_, i) => `張${i},部門${i},${i}`).join("\n");
    const content = `姓名,部門,編號\n${rows}`;
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100);

    expect(result.rows.length).toBeLessThanOrEqual(100);
    expect(result.hasMore).toBe(true);
    expect(result.totalRows).toBe(150);
  });

  it("應該處理包含引號和逗號的 CSV", async () => {
    const content = '姓名,描述\n張三,"設計師, 資深"\n李四,"工程師, ""專家"""';
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100);

    expect(result.rows[0][1]).toBe("設計師, 資深");
    expect(result.rows[1][1]).toBe('工程師, "專家"');
  });

  it("應該處理空白欄位", async () => {
    const content = "姓名,部門,備註\n張三,,\n李四,工程部,";
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100);

    expect(result.rows[0][1]).toBe("");
    expect(result.rows[0][2]).toBe("");
  });
});

describe("CSV 功能端到端測試", () => {
  it("應該完整處理 Big5 編碼的員工資料", async () => {
    const content = "姓名,部門名稱,電子郵件\n張三,設計部,zhang@example.com\n李四,工程部,li@example.com";
    const iconv = require("iconv-lite");
    const buffer = iconv.encode(content, "big5");

    const result = await parseCSVForPreview(buffer, 100, EMPLOYEE_IMPORT_RULES);

    expect(result.encoding).toBe("big5");
    expect(result.headers).toContain("姓名");
    expect(result.validation?.valid).toBe(true);
    expect(result.rows).toHaveLength(2);
  });

  it("應該處理包含錯誤的 CSV 並提供詳細報告", async () => {
    const content = "姓名,部門名稱,電子郵件\n張三,設計部,invalid-email\n,工程部,li@example.com";
    const buffer = Buffer.from(content, "utf-8");

    const result = await parseCSVForPreview(buffer, 100, EMPLOYEE_IMPORT_RULES);

    expect(result.validation?.valid).toBe(false);
    expect(result.validation?.errors.length).toBeGreaterThan(0);
    
    // 應該有兩個錯誤：無效的電子郵件和缺少姓名
    const errorTypes = result.validation?.errors.map(e => e.type) || [];
    expect(errorTypes).toContain("format"); // 無效的電子郵件
    expect(errorTypes).toContain("missing"); // 缺少姓名
  });
});

