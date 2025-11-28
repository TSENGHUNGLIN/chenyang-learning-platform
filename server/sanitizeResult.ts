/**
 * 確保分析結果中的所有陣列欄位都是真正的陣列
 * 並且所有物件都是純物件，沒有任何特殊屬性
 */
export function sanitizeAnalysisResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  // 創建一個全新的物件，明確複製每個欄位
  const sanitized: any = {};

  // 複製 performance
  if (result.performance && typeof result.performance === 'object') {
    sanitized.performance = {
      score: result.performance.score,
      strengths: Array.isArray(result.performance.strengths) ? result.performance.strengths : [],
      weaknesses: Array.isArray(result.performance.weaknesses) ? result.performance.weaknesses : [],
      suggestions: Array.isArray(result.performance.suggestions) ? result.performance.suggestions : [],
    };
  }

  // 複製頂層陣列欄位
  sanitized.knowledgeGaps = Array.isArray(result.knowledgeGaps) ? result.knowledgeGaps : [];
  sanitized.recommendedQuestions = Array.isArray(result.recommendedQuestions) ? result.recommendedQuestions : [];
  sanitized.questionsOnly = Array.isArray(result.questionsOnly) ? result.questionsOnly : [];
  sanitized.questionsWithAnswers = Array.isArray(result.questionsWithAnswers) ? result.questionsWithAnswers : [];

  // 清理 questionsOnly 中的每個題目
  if (Array.isArray(sanitized.questionsOnly)) {
    sanitized.questionsOnly = sanitized.questionsOnly.map((q: any) => {
      if (!q || typeof q !== 'object') return q;
      
      return {
        type: q.type,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        difficulty: q.difficulty,
        suggestedTags: Array.isArray(q.suggestedTags) ? q.suggestedTags : [],
        explanation: q.explanation,
      };
    });
  }

  // 清理 questionsWithAnswers 中的每個題目
  if (Array.isArray(sanitized.questionsWithAnswers)) {
    sanitized.questionsWithAnswers = sanitized.questionsWithAnswers.map((q: any) => {
      if (!q || typeof q !== 'object') return q;
      
      return {
        type: q.type,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        suggestedTags: Array.isArray(q.suggestedTags) ? q.suggestedTags : [],
        explanation: q.explanation,
      };
    });
  }

  console.log("[Sanitize] 已清理結果，questionsWithAnswers長度:", sanitized.questionsWithAnswers?.length);
  
  return sanitized;
}
