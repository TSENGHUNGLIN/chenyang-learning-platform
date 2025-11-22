import iconv from "iconv-lite";
import { detectEncoding, convertToUTF8 } from "./encodingDetector";
import {
  validateCSV as validateCSVData,
  ValidationResult,
  FieldValidationRule,
} from "./csvValidator";

/**
 * CSV 預覽資料結構
 */
export interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalColumns: number;
  hasMore: boolean;
  encoding?: string; // 偵測到的編碼格式
  encodingConfidence?: number; // 編碼偵測信心度
  validation?: ValidationResult; // 格式驗證結果
}

/**
 * 解析 CSV 內容並返回預覽資料
 * @param buffer CSV 檔案的 Buffer
 * @param maxRows 最多返回的行數（預設 100）
 * @returns CSV 預覽資料
 */
export async function parseCSVForPreview(
  buffer: Buffer,
  maxRows: number = 100,
  validationRules?: FieldValidationRule[]
): Promise<CSVPreviewData> {
  try {
    // 自動偵測編碼並轉換為 UTF-8
    const detectionResult = detectEncoding(buffer);
    const content = detectionResult.content;

    // 分割成行
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      throw new Error("CSV 檔案為空");
    }

    // 解析標題行
    const headers = parseCSVLine(lines[0]);

    // 解析資料行（最多 maxRows 行）
    const rows: string[][] = [];
    const dataLines = lines.slice(1);
    const rowsToRead = Math.min(dataLines.length, maxRows);

    for (let i = 0; i < rowsToRead; i++) {
      const row = parseCSVLine(dataLines[i]);
      // 確保每行的欄位數量與標題一致
      while (row.length < headers.length) {
        row.push("");
      }
      rows.push(row.slice(0, headers.length));
    }

    // 執行格式驗證（如果提供了驗證規則）
    let validation: ValidationResult | undefined;
    if (validationRules && validationRules.length > 0) {
      validation = validateCSVData(headers, rows, validationRules);
    }

    return {
      headers,
      rows,
      totalRows: dataLines.length,
      totalColumns: headers.length,
      hasMore: dataLines.length > maxRows,
      encoding: detectionResult.encoding,
      encodingConfidence: detectionResult.confidence,
      validation,
    };
  } catch (error) {
    console.error("[CSV Preview] 解析錯誤:", error);
    throw new Error(`CSV 解析失敗: ${error instanceof Error ? error.message : "未知錯誤"}`);
  }
}

/**
 * 解析單行 CSV（處理引號和逗號）
 * @param line CSV 行
 * @returns 欄位陣列
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 雙引號轉義
        current += '"';
        i++; // 跳過下一個引號
      } else {
        // 切換引號狀態
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // 欄位分隔符號
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // 加入最後一個欄位
  result.push(current.trim());

  return result;
}

/**
 * 驗證 CSV 檔案格式
 * @param buffer CSV 檔案的 Buffer
 * @param requiredHeaders 必要的欄位名稱（可選）
 * @returns 驗證結果
 */
export async function validateCSV(
  buffer: Buffer,
  requiredHeaders?: string[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const preview = await parseCSVForPreview(buffer, 1);

    // 檢查是否有標題
    if (preview.headers.length === 0) {
      errors.push("CSV 檔案缺少標題行");
    }

    // 檢查必要欄位
    if (requiredHeaders && requiredHeaders.length > 0) {
      const missingHeaders = requiredHeaders.filter(
        header => !preview.headers.includes(header)
      );
      if (missingHeaders.length > 0) {
        errors.push(`缺少必要欄位: ${missingHeaders.join(", ")}`);
      }
    }

    // 檢查是否有資料行
    if (preview.totalRows === 0) {
      errors.push("CSV 檔案沒有資料行");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "未知錯誤");
    return {
      valid: false,
      errors,
    };
  }
}

