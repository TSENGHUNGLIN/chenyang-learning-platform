import { TRPCError } from "@trpc/server";

/**
 * 帶重試機制的LLM調用包裝函數
 */
export async function invokeLLMWithRetry(
  invokeLLM: any,
  params: any,
  maxRetries: number = 2
): Promise<any> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI分析] 嘗試第 ${attempt + 1}/${maxRetries + 1} 次調用 LLM API...`);
      
      const response = await invokeLLM(params);
      
      console.log(`[AI分析] 第 ${attempt + 1} 次調用成功`);
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`[AI分析] 第 ${attempt + 1} 次調用失敗:`, error.message);
      
      // 如果是最後一次嘗試，直接拋出錯誤
      if (attempt === maxRetries) {
        break;
      }
      
      // 等待一段時間後重試（指數退避）
      const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
      console.log(`[AI分析] 等待 ${waitTime}ms 後重試...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // 所有重試都失敗，拋出詳細錯誤
  const errorMessage = lastError?.message || "未知錯誤";
  const errorDetails = lastError?.response?.data || lastError?.stack || "";
  
  console.error(`[AI分析] 所有重試都失敗，最後錯誤:`, errorMessage, errorDetails);
  
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `AI分析失敗：${errorMessage}。請稍後再試或聯繫管理員。`,
    cause: lastError,
  });
}

/**
 * 解析LLM返回的JSON結果
 */
export function parseLLMResponse(response: any): any {
  try {
    const content = response.choices[0].message.content;
    const resultText = typeof content === 'string' ? content : JSON.stringify(content);
    return JSON.parse(resultText || "{}");
  } catch (error: any) {
    console.error("[AI分析] 解析LLM回應失敗:", error.message);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI分析結果格式錯誤，請重試",
      cause: error,
    });
  }
}

