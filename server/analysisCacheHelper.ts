import { createHash } from "crypto";

/**
 * 計算分析請求的MD5雜湊（用於快取）
 */
export function calculateAnalysisHash(params: {
  fileIds: number[];
  analysisType: string;
  analysisMode: string;
  customPrompt: string;
}): string {
  // 將參數轉換為穩定的字串格式
  const sortedFileIds = [...params.fileIds].sort((a, b) => a - b);
  const cacheKey = JSON.stringify({
    fileIds: sortedFileIds,
    analysisType: params.analysisType,
    analysisMode: params.analysisMode,
    prompt: params.customPrompt.trim(),
  });
  
  // 計算MD5雜湊
  return createHash("md5").update(cacheKey).digest("hex");
}

/**
 * 從快取中查找分析結果
 */
export async function findCachedAnalysis(
  resultHash: string,
  getAnalysisHistoryByHash: (hash: string) => Promise<any>
): Promise<any | null> {
  try {
    const cachedResult = await getAnalysisHistoryByHash(resultHash);
    
    if (cachedResult) {
      console.log(`[快取] 找到快取結果，ID: ${cachedResult.id}`);
      return cachedResult;
    }
    
    console.log(`[快取] 未找到快取結果`);
    return null;
  } catch (error) {
    console.error(`[快取] 查找快取時發生錯誤:`, error);
    return null;
  }
}

