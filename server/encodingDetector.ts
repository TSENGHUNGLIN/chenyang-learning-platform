import * as iconv from "iconv-lite";

/**
 * 編碼偵測輔助模組
 * 支援自動偵測 CSV 檔案的編碼格式並轉換為 UTF-8
 */

/**
 * 支援的編碼格式
 */
export const SUPPORTED_ENCODINGS = ["utf-8", "big5", "gbk", "gb2312", "shift_jis"] as const;
export type SupportedEncoding = (typeof SUPPORTED_ENCODINGS)[number];

/**
 * 偵測結果
 */
export interface EncodingDetectionResult {
  encoding: SupportedEncoding;
  confidence: number; // 0-100，信心度
  content: string; // 轉換後的 UTF-8 內容
}

/**
 * 檢查 Buffer 是否包含 BOM（Byte Order Mark）
 */
function detectBOM(buffer: Buffer): SupportedEncoding | null {
  // UTF-8 BOM: EF BB BF
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8";
  }
  return null;
}

/**
 * 計算解碼後的文字品質分數
 * 用於判斷解碼是否成功
 */
function calculateQualityScore(text: string): number {
  let score = 100;

  // 檢查是否包含亂碼字元
  const invalidChars = /[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g;
  const invalidMatches = text.match(invalidChars);
  if (invalidMatches) {
    score -= invalidMatches.length * 5; // 每個亂碼字元扣 5 分
  }

  // 檢查是否包含常見的中文字元
  const chineseChars = /[\u4e00-\u9fa5]/g;
  const chineseMatches = text.match(chineseChars);
  if (chineseMatches && chineseMatches.length > 0) {
    score += 10; // 有中文字元加 10 分
  }

  // 檢查是否包含常見的標點符號
  const punctuation = /[，。！？、；：""''（）【】《》]/g;
  const punctuationMatches = text.match(punctuation);
  if (punctuationMatches && punctuationMatches.length > 0) {
    score += 5; // 有中文標點符號加 5 分
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 自動偵測 CSV 檔案的編碼格式
 * @param buffer CSV 檔案的 Buffer
 * @returns 偵測結果（編碼、信心度、轉換後的內容）
 */
export function detectEncoding(buffer: Buffer): EncodingDetectionResult {
  // 1. 檢查 BOM
  const bomEncoding = detectBOM(buffer);
  if (bomEncoding) {
    // 移除 BOM 後解碼
    const contentBuffer = buffer.slice(3);
    const content = iconv.decode(contentBuffer, bomEncoding);
    return {
      encoding: bomEncoding,
      confidence: 100,
      content,
    };
  }

  // 2. 嘗試各種編碼並計算品質分數
  const results: Array<{
    encoding: SupportedEncoding;
    content: string;
    score: number;
  }> = [];

  for (const encoding of SUPPORTED_ENCODINGS) {
    try {
      const content = iconv.decode(buffer, encoding);
      const score = calculateQualityScore(content);
      results.push({ encoding, content, score });
    } catch (error) {
      // 解碼失敗，跳過此編碼
      continue;
    }
  }

  // 3. 選擇分數最高的編碼
  results.sort((a, b) => b.score - a.score);
  const best = results[0];

  if (!best) {
    // 如果所有編碼都失敗，回退到 UTF-8
    return {
      encoding: "utf-8",
      confidence: 0,
      content: buffer.toString("utf-8"),
    };
  }

  return {
    encoding: best.encoding,
    confidence: best.score,
    content: best.content,
  };
}

/**
 * 將任意編碼的 Buffer 轉換為 UTF-8 字串
 * @param buffer 原始 Buffer
 * @returns UTF-8 字串
 */
export function convertToUTF8(buffer: Buffer): string {
  const result = detectEncoding(buffer);
  return result.content;
}

/**
 * 從 URL 下載檔案並自動偵測編碼
 * @param url 檔案 URL
 * @returns 偵測結果
 */
export async function detectEncodingFromURL(url: string): Promise<EncodingDetectionResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return detectEncoding(buffer);
}

