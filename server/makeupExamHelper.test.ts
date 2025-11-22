import { describe, it, expect } from 'vitest';

describe('補考機制測試', () => {
  it('應該正確匯入補考輔助模組', async () => {
    const module = await import('./makeupExamHelper');
    expect(module.autoCreateMakeupExamForFailedStudent).toBeDefined();
    expect(module.scheduleMakeupExam).toBeDefined();
    expect(module.getPendingMakeupExams).toBeDefined();
    expect(module.getMakeupExamHistory).toBeDefined();
    expect(module.updateMakeupExamScore).toBeDefined();
    expect(module.getLearningRecommendations).toBeDefined();
    expect(module.markRecommendationAsRead).toBeDefined();
  });

  it('應該正確匯入 schema 定義', async () => {
    const { makeupExams, learningRecommendations, notifications } = await import('../drizzle/schema');
    expect(makeupExams).toBeDefined();
    expect(learningRecommendations).toBeDefined();
    expect(notifications).toBeDefined();
  });

  it('應該正確定義 tRPC 路由', async () => {
    const { appRouter } = await import('./routers');
    // 檢查 router 的子路由是否存在（使用點記法格式）
    const routerKeys = Object.keys(appRouter._def.procedures);
    const hasMakeupExams = routerKeys.some(key => key.startsWith('makeupExams.'));
    const hasLearningRecommendations = routerKeys.some(key => key.startsWith('learningRecommendations.'));
    expect(hasMakeupExams).toBe(true);
    expect(hasLearningRecommendations).toBe(true);
  });
});
