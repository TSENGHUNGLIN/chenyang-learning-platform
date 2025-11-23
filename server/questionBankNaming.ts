import { invokeLLM } from "./_core/llm";

/**
 * 使用AI分析題目內容並生成題庫檔案名稱
 */
export async function generateQuestionBankName(questions: Array<{
  type: string;
  question: string;
  correctAnswer?: string;
}>): Promise<string> {
  try {
    // 取前10題作為樣本（避免token過多）
    const sampleQuestions = questions.slice(0, 10);
    
    // 構建提示詞
    const questionsText = sampleQuestions
      .map((q, index) => `${index + 1}. ${q.question}`)
      .join("\n");

    const prompt = `請分析以下題目，並為這個題庫檔案生成一個簡短、精確的名稱（10-20字）。

題目樣本：
${questionsText}

請根據題目的主題、領域、難度等特徵，生成一個適合的題庫檔案名稱。
只需要回傳名稱本身，不要有其他說明文字。

範例：
- 「JavaScript基礎語法測驗」
- 「數據結構與演算法進階題庫」
- 「公司政策與規章制度考核」`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一個專業的教育測評專家，擅長分析題目內容並生成精確的題庫名稱。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const generatedName = response.choices[0]?.message?.content?.trim() || "";
    
    // 移除可能的引號
    const cleanedName = generatedName.replace(/^["']|["']$/g, "");
    
    // 如果生成的名稱太長，截斷並加上省略號
    if (cleanedName.length > 50) {
      return cleanedName.substring(0, 47) + "...";
    }
    
    return cleanedName || "未命名題庫";
  } catch (error) {
    console.error("AI命名失敗:", error);
    return "未命名題庫";
  }
}

/**
 * 從檔案名稱提取題庫名稱（作為備選方案）
 */
export function extractNameFromFilename(filename: string): string {
  // 移除副檔名
  const nameWithoutExt = filename.replace(/\.(docx?|csv|txt|pdf)$/i, "");
  
  // 移除常見的前綴（如日期、編號等）
  const cleaned = nameWithoutExt
    .replace(/^\d{4}-\d{2}-\d{2}[-_]?/g, "") // 移除日期前綴
    .replace(/^[\d_-]+/g, "") // 移除數字前綴
    .trim();
  
  return cleaned || "未命名題庫";
}

