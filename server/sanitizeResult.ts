/**
 * 確保分析結果中的所有陣列欄位都是真正的陣列
 */
export function sanitizeAnalysisResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  // 深度克隆以避免修改原始物件
  const sanitized = JSON.parse(JSON.stringify(result));

  // 確保 performance 中的陣列欄位
  if (sanitized.performance) {
    sanitized.performance.strengths = Array.isArray(sanitized.performance.strengths) 
      ? sanitized.performance.strengths 
      : [];
    sanitized.performance.weaknesses = Array.isArray(sanitized.performance.weaknesses) 
      ? sanitized.performance.weaknesses 
      : [];
    sanitized.performance.suggestions = Array.isArray(sanitized.performance.suggestions) 
      ? sanitized.performance.suggestions 
      : [];
  }

  // 確保頂層陣列欄位
  sanitized.knowledgeGaps = Array.isArray(sanitized.knowledgeGaps) 
    ? sanitized.knowledgeGaps 
    : [];
  sanitized.recommendedQuestions = Array.isArray(sanitized.recommendedQuestions) 
    ? sanitized.recommendedQuestions 
    : [];
  sanitized.questionsOnly = Array.isArray(sanitized.questionsOnly) 
    ? sanitized.questionsOnly 
    : [];
  sanitized.questionsWithAnswers = Array.isArray(sanitized.questionsWithAnswers) 
    ? sanitized.questionsWithAnswers 
    : [];

  // 確保每個題目中的陣列欄位
  if (Array.isArray(sanitized.questionsOnly)) {
    sanitized.questionsOnly = sanitized.questionsOnly.map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
      suggestedTags: Array.isArray(q.suggestedTags) ? q.suggestedTags : [],
    }));
  }

  if (Array.isArray(sanitized.questionsWithAnswers)) {
    sanitized.questionsWithAnswers = sanitized.questionsWithAnswers.map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
      suggestedTags: Array.isArray(q.suggestedTags) ? q.suggestedTags : [],
    }));
  }

  console.log("[Sanitize] 已清理結果，questionsWithAnswers長度:", sanitized.questionsWithAnswers?.length);
  
  return sanitized;
}
