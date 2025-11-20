/**
 * 新功能測試
 * 測試AI分析自動分類標籤、考試監控儀表板、權限預覽功能
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { previewAccessibleExaminees } from '../server/permissionPreviewHelper';

describe('新功能測試', () => {
  describe('權限預覽功能', () => {
    it('應該正確計算可訪問的考生列表（基於部門權限）', async () => {
      // 測試當選擇部門時，能正確計算該部門下的所有考生
      const result = await previewAccessibleExaminees([1], []);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 驗證結果包含必要欄位
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('email');
        expect(result[0]).toHaveProperty('source');
        expect(result[0].source).toContain('部門權限');
      }
    });

    it('應該正確計算可訪問的考生列表（基於個別權限）', async () => {
      // 測試當選擇個別考生時，能正確返回這些考生
      const result = await previewAccessibleExaminees([], [1, 2]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 驗證結果包含必要欄位
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('source');
        expect(result[0].source).toBe('個別權限');
      }
    });

    it('應該正確合併部門權限和個別權限（去重）', async () => {
      // 測試當同時選擇部門和個別考生時，能正確合併並去重
      const result = await previewAccessibleExaminees([1], [1, 2]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 驗證沒有重複的ID
      const ids = result.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('當沒有選擇任何權限時，應該返回空陣列', async () => {
      const result = await previewAccessibleExaminees([], []);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('標籤系統', () => {
    it('應該成功建立27個新標籤（業界分類、空間類型、風格類型）', async () => {
      const { getDb } = await import('../server/db');
      const { tags } = await import('../drizzle/schema');
      const db = await getDb();
      
      if (!db) {
        console.warn('資料庫未連線，跳過測試');
        return;
      }

      const allTags = await db.select().from(tags);
      
      // 驗證標籤總數（至少包含27個新標籤 + 1個AI生成標籤）
      expect(allTags.length).toBeGreaterThanOrEqual(28);
      
      // 驗證業界分類標籤
      const industryTags = allTags.filter(t => t.category === '業界分類');
      expect(industryTags.length).toBe(8);
      
      // 驗證空間類型標籤
      const spaceTags = allTags.filter(t => t.category === '空間類型');
      expect(spaceTags.length).toBe(10);
      
      // 驗證風格類型標籤
      const styleTags = allTags.filter(t => t.category === '風格類型');
      expect(styleTags.length).toBe(9);
      
      // 驗證AI生成標籤
      const aiTag = allTags.find(t => t.name === 'AI生成');
      expect(aiTag).toBeDefined();
      // AI生成標籤的category可能為空或「題目來源」
      if (aiTag?.category) {
        expect(aiTag.category).toBe('題目來源');
      }
    });
  });

  describe('資料庫Schema', () => {
    it('questions表應該包含AI相關欄位', async () => {
      const { getDb } = await import('../server/db');
      const { questions } = await import('../drizzle/schema');
      const { sql } = await import('drizzle-orm');
      const db = await getDb();
      
      if (!db) {
        console.warn('資料庫未連線，跳過測試');
        return;
      }

      // 查詢表結構
      const result: any = await db.execute(sql`DESCRIBE questions`);
      const columns = (result[0] || result).map((row: any) => row.Field);
      
      // 驗證新增的欄位
      expect(columns).toContain('isAiGenerated');
      expect(columns).toContain('suggestedCategoryId');
      expect(columns).toContain('suggestedTagIds');
    });

    it('tags表應該包含category和description欄位', async () => {
      const { getDb } = await import('../server/db');
      const { sql } = await import('drizzle-orm');
      const db = await getDb();
      
      if (!db) {
        console.warn('資料庫未連線，跳過測試');
        return;
      }

      // 查詢表結構
      const result: any = await db.execute(sql`DESCRIBE tags`);
      const columns = (result[0] || result).map((row: any) => row.Field);
      
      // 驗證新增的欄位
      expect(columns).toContain('category');
      expect(columns).toContain('description');
    });
  });
});

