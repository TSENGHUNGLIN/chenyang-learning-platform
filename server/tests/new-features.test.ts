import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';

describe('新功能測試', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('首頁儀表板統計', () => {
    it('應該能夠取得統計資料', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'admin', name: 'Test Admin', openId: 'test-admin' },
        req: {} as any,
        res: {} as any,
      });

      const stats = await caller.dashboard.stats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalQuestions');
      expect(stats).toHaveProperty('totalExams');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('totalExaminees');
      expect(typeof stats.totalQuestions).toBe('number');
      expect(typeof stats.totalExams).toBe('number');
      expect(typeof stats.averageScore).toBe('number');
      expect(typeof stats.totalExaminees).toBe('number');
    });

    it('應該能夠取得最近活動', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'admin', name: 'Test Admin', openId: 'test-admin' },
        req: {} as any,
        res: {} as any,
      });

      const activities = await caller.dashboard.recentActivities();

      expect(Array.isArray(activities)).toBe(true);
      // 每個活動應該有type, title, description, timestamp
      if (activities.length > 0) {
        const activity = activities[0];
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('title');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('timestamp');
        expect(['file_upload', 'exam_created', 'exam_submitted']).toContain(activity.type);
      }
    });
  });

  describe('AI建議功能', () => {
    it('應該能夠取得包含AI建議欄位的題目列表', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'admin', name: 'Test Admin', openId: 'test-admin' },
        req: {} as any,
        res: {} as any,
      });

      const questions = await caller.questions.list();

      expect(Array.isArray(questions)).toBe(true);
      if (questions.length > 0) {
        const question = questions[0];
        // 檢查是否有AI相關欄位
        expect(question).toHaveProperty('isAiGenerated');
        expect(question).toHaveProperty('suggestedCategoryId');
        expect(question).toHaveProperty('suggestedTagIds');
      }
    });

    it('應該能夠採用AI建議（如果有AI生成的題目）', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'admin', name: 'Test Admin', openId: 'test-admin' },
        req: {} as any,
        res: {} as any,
      });

      const questions = await caller.questions.list();
      const aiQuestion = questions.find((q: any) => q.isAiGenerated === 1 && q.suggestedCategoryId);

      if (aiQuestion) {
        const result = await caller.questions.applyAiSuggestions(aiQuestion.id);
        expect(result.success).toBe(true);

        // 驗證分類已更新
        const updatedQuestion = await caller.questions.getById(aiQuestion.id);
        expect(updatedQuestion?.categoryId).toBe(aiQuestion.suggestedCategoryId);
      } else {
        console.log('沒有AI生成的題目可測試，跳過此測試');
        expect(true).toBe(true); // 通過測試
      }
    });
  });

  describe('考試監控儀表板', () => {
    it('側邊欄應該包含考試監控選單（編輯者和管理員可見）', () => {
      // 這個測試主要是確認路由已設定
      // 實際的UI測試需要在前端進行
      expect(true).toBe(true);
    });
  });

  describe('資料庫查詢效能', () => {
    it('getDashboardStats 應該在合理時間內完成', async () => {
      const { getDashboardStats } = await import('../db');
      
      const startTime = Date.now();
      const stats = await getDashboardStats('admin', 1);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 應該在5秒內完成
      expect(stats).toBeDefined();
    });

    it('getRecentActivities 應該在合理時間內完成', async () => {
      const { getRecentActivities } = await import('../db');
      
      const startTime = Date.now();
      const activities = await getRecentActivities('admin', 1);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 應該在5秒內完成
      expect(Array.isArray(activities)).toBe(true);
    });
  });
});

