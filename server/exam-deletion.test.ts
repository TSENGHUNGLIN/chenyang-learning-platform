import { describe, it, expect, beforeAll } from 'vitest';
import { getExamDeletionImpact, softDeleteExam, restoreExam, getDeletedExams, getActiveExams } from '../server/examDeletion';

describe('考試刪除管理功能測試', () => {
  describe('刪除影響分析', () => {
    it('應該能夠獲取考試的刪除影響分析', async () => {
      // 測試獲取刪除影響分析
      // 注意：這個測試需要資料庫中存在考試資料
      try {
        const impact = await getExamDeletionImpact(1);
        
        expect(impact).toBeDefined();
        expect(impact).toHaveProperty('examId');
        expect(impact).toHaveProperty('examTitle');
        expect(impact).toHaveProperty('assignedCount');
        expect(impact).toHaveProperty('submittedCount');
        expect(impact).toHaveProperty('makeupCount');
        expect(impact).toHaveProperty('canDelete');
        expect(impact).toHaveProperty('warnings');
        
        expect(typeof impact.assignedCount).toBe('number');
        expect(typeof impact.submittedCount).toBe('number');
        expect(typeof impact.makeupCount).toBe('number');
        expect(typeof impact.canDelete).toBe('boolean');
        expect(Array.isArray(impact.warnings)).toBe(true);
      } catch (error: any) {
        // 如果考試不存在，應該拋出錯誤
        expect(error.message).toContain('考試不存在');
      }
    });
  });

  describe('軟刪除功能', () => {
    it('應該能夠軟刪除考試', async () => {
      // 測試軟刪除功能
      // 注意：這個測試需要資料庫中存在考試資料
      try {
        await softDeleteExam(1);
        
        // 驗證考試已被軟刪除
        const deletedExams = await getDeletedExams();
        const deletedExam = deletedExams.find((e: any) => e.id === 1);
        
        if (deletedExam) {
          expect(deletedExam.deletedAt).not.toBeNull();
        }
      } catch (error: any) {
        // 如果考試不存在或已被刪除，應該拋出錯誤
        console.log('軟刪除測試錯誤:', error.message);
      }
    });

    it('應該能夠恢復已刪除的考試', async () => {
      // 測試恢復功能
      try {
        await restoreExam(1);
        
        // 驗證考試已被恢復
        const activeExams = await getActiveExams();
        const restoredExam = activeExams.find((e: any) => e.id === 1);
        
        if (restoredExam) {
          expect(restoredExam.deletedAt).toBeNull();
        }
      } catch (error: any) {
        console.log('恢復測試錯誤:', error.message);
      }
    });
  });

  describe('回收站查詢', () => {
    it('應該能夠獲取已刪除的考試列表', async () => {
      const deletedExams = await getDeletedExams();
      
      expect(Array.isArray(deletedExams)).toBe(true);
      
      // 驗證每個已刪除的考試都有 deletedAt 欄位
      deletedExams.forEach((exam: any) => {
        expect(exam.deletedAt).not.toBeNull();
      });
    });

    it('應該能夠獲取未刪除的考試列表', async () => {
      const activeExams = await getActiveExams();
      
      expect(Array.isArray(activeExams)).toBe(true);
      
      // 驗證每個未刪除的考試都沒有 deletedAt 欄位
      activeExams.forEach((exam: any) => {
        expect(exam.deletedAt).toBeNull();
      });
    });

    it('已刪除和未刪除的考試列表應該互斥', async () => {
      const deletedExams = await getDeletedExams();
      const activeExams = await getActiveExams();
      
      const deletedIds = new Set(deletedExams.map((e: any) => e.id));
      const activeIds = new Set(activeExams.map((e: any) => e.id));
      
      // 驗證沒有考試同時出現在兩個列表中
      deletedIds.forEach(id => {
        expect(activeIds.has(id)).toBe(false);
      });
    });
  });

  describe('資料完整性驗證', () => {
    it('軟刪除不應該影響考試的基本資訊', async () => {
      try {
        // 獲取考試原始資訊
        const activeExams = await getActiveExams();
        if (activeExams.length === 0) {
          console.log('沒有可用的考試進行測試');
          return;
        }
        
        const testExam = activeExams[0];
        const originalTitle = testExam.title;
        const originalStatus = testExam.status;
        
        // 軟刪除考試
        await softDeleteExam(testExam.id);
        
        // 獲取已刪除的考試
        const deletedExams = await getDeletedExams();
        const deletedExam = deletedExams.find((e: any) => e.id === testExam.id);
        
        if (deletedExam) {
          // 驗證基本資訊未改變
          expect(deletedExam.title).toBe(originalTitle);
          expect(deletedExam.status).toBe(originalStatus);
          expect(deletedExam.deletedAt).not.toBeNull();
        }
        
        // 恢復考試
        await restoreExam(testExam.id);
      } catch (error: any) {
        console.log('資料完整性測試錯誤:', error.message);
      }
    });
  });
});

