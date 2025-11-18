/**
 * AI分析結果題目解析工具
 * 從AI生成的分析結果文字中提取題目資訊
 */

export interface ParsedQuestion {
  type: "true_false" | "multiple_choice" | "short_answer";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options?: string; // JSON string for multiple choice options
  correctAnswer: string;
  explanation?: string;
  categoryId?: number;
  tagIds?: number[];
}

/**
 * 從AI分析結果中解析題目
 * @param analysisResult AI分析結果文字（包含「題目與答案」部分）
 * @returns 解析後的題目陣列
 */
export function parseQuestionsFromAnalysis(analysisResult: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // 尋找「題目與答案」部分
  const questionsWithAnswersMatch = analysisResult.match(/題目與答案[\s\S]*$/);
  if (!questionsWithAnswersMatch) {
    console.warn("未找到「題目與答案」部分");
    return questions;
  }
  
  const questionsText = questionsWithAnswersMatch[0];
  
  // 分割題目（以數字加句點開頭，例如：1., 2., 3.）
  const questionBlocks = questionsText.split(/\n(?=\d+\.\s*\n)/);
  
  for (const block of questionBlocks) {
    if (block.trim().length === 0) continue;
    
    try {
      const parsed = parseQuestionBlock(block);
      if (parsed) {
        questions.push(parsed);
      }
    } catch (error) {
      console.error("解析題目失敗:", error, block);
    }
  }
  
  return questions;
}

/**
 * 解析單個題目區塊
 */
function parseQuestionBlock(block: string): ParsedQuestion | null {
  // 識別題型
  let type: "true_false" | "multiple_choice" | "short_answer";
  if (block.includes("是非題")) {
    type = "true_false";
  } else if (block.includes("選擇題")) {
    type = "multiple_choice";
  } else if (block.includes("問答題")) {
    type = "short_answer";
  } else {
    return null;
  }
  
  // 提取題目內容（題型標記後到答案之前的部分）
  const questionMatch = block.match(/(?:是非題|選擇題|問答題)\s*\n\n([\s\S]*?)(?=\n\*\s+[A-D]\.|答案：)/);
  if (!questionMatch) {
    return null;
  }
  const question = questionMatch[1].trim();
  
  // 提取選項（僅選擇題）
  let options: string | undefined;
  if (type === "multiple_choice") {
    const optionsMatch = block.match(/\*\s+([A-D]\.\s+[\s\S]*?)(?=\n\n答案：)/);
    if (optionsMatch) {
      const optionsText = optionsMatch[1];
      // 解析選項為 JSON 格式
      const optionLines = optionsText.split(/\n\*\s+/).filter(line => line.trim());
      const optionsObj: Record<string, string> = {};
      
      for (const line of optionLines) {
        const match = line.match(/^([A-D])\.\s+(.+)$/);
        if (match) {
          optionsObj[match[1]] = match[2].trim();
        }
      }
      
      options = JSON.stringify(optionsObj);
    }
  }
  
  // 提取答案
  const answerMatch = block.match(/答案：\s*([^\n]+)/);
  if (!answerMatch) {
    return null;
  }
  let correctAnswer = answerMatch[1].trim();
  
  // 標準化是非題答案
  if (type === "true_false") {
    if (correctAnswer.includes("錯誤") || correctAnswer.includes("X") || correctAnswer === "否") {
      correctAnswer = "X";
    } else if (correctAnswer.includes("正確") || correctAnswer.includes("O") || correctAnswer === "是") {
      correctAnswer = "O";
    }
  }
  
  // 提取解釋
  const explanationMatch = block.match(/解釋：\s*([\s\S]+?)(?=\n\n\d+\.|$)/);
  const explanation = explanationMatch ? explanationMatch[1].trim() : undefined;
  
  // 推斷難度
  const difficulty = inferDifficulty(type, question, explanation);
  
  return {
    type,
    difficulty,
    question,
    options,
    correctAnswer,
    explanation,
  };
}

/**
 * 根據題型和內容推斷難度
 */
function inferDifficulty(
  type: "true_false" | "multiple_choice" | "short_answer",
  question: string,
  explanation?: string
): "easy" | "medium" | "hard" {
  // 基本規則：
  // - 是非題：簡單
  // - 選擇題：中等
  // - 問答題：困難
  
  if (type === "true_false") {
    return "easy";
  } else if (type === "short_answer") {
    return "hard";
  } else {
    // 選擇題：根據題目長度和複雜度判斷
    if (question.length > 100 || (explanation && explanation.length > 150)) {
      return "hard";
    } else {
      return "medium";
    }
  }
}

/**
 * 驗證解析後的題目是否有效
 */
export function validateParsedQuestion(question: ParsedQuestion): { valid: boolean; error?: string } {
  if (!question.question || question.question.trim().length === 0) {
    return { valid: false, error: "題目內容不能為空" };
  }
  
  if (!question.correctAnswer || question.correctAnswer.trim().length === 0) {
    return { valid: false, error: "答案不能為空" };
  }
  
  if (question.type === "multiple_choice") {
    if (!question.options) {
      return { valid: false, error: "選擇題必須包含選項" };
    }
    
    try {
      const optionsObj = JSON.parse(question.options);
      if (Object.keys(optionsObj).length < 2) {
        return { valid: false, error: "選擇題至少需要2個選項" };
      }
    } catch {
      return { valid: false, error: "選項格式錯誤" };
    }
  }
  
  return { valid: true };
}

