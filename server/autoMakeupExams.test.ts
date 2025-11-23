import { describe, it, expect } from 'vitest';
import { autoScheduleMakeupExams, getMakeupExamsWithOverdueInfo, updateMakeupExamStatus, checkExpiredMakeupExams, getMakeupExamStats } from '../server/db';

describe('補考自動安排測試', () => {
  it('應該能夠自動為逾期考試建立補考記錄', async () => {
    const result = await autoScheduleMakeupExams({
      maxMakeupAttempts: 2,
      makeupDaysAfterOverdue: 7,
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.makeupRecordsCreated).toBe('number');
    expect(typeof result.overdueAssignments).toBe('number');
    
    console.log('✅ 自動建立補考記錄結果:', result);
  });

  it('應該能夠查詢補考記錄（包含逾期資訊）', async () => {
    const result = await getMakeupExamsWithOverdueInfo({ limit: 10 });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    console.log('✅ 查詢補考記錄:', result.length, '筆');
  });

  it('應該能夠檢查逾期補考並自動更新狀態', async () => {
    const result = await checkExpiredMakeupExams();
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.expiredCount).toBe('number');
    
    console.log('✅ 檢查逾期補考結果:', result);
  });

  it('應該能夠取得補考統計資料', async () => {
    const result = await getMakeupExamStats();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    console.log('✅ 補考統計資料:', result);
  });
});

