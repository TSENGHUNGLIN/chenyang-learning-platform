import { describe, it, expect, beforeAll } from 'vitest';
import { checkAndCreateOverdueNotifications, sendOverdueNotifications, getOverdueNotificationHistory, getOverdueNotificationStats } from '../server/db';

describe('逾期通知自動化測試', () => {
  it('應該能夠檢查並建立逾期通知記錄', async () => {
    const result = await checkAndCreateOverdueNotifications();
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.notificationsCreated).toBe('number');
    expect(typeof result.overdueAssignments).toBe('number');
    
    console.log('✅ 檢查逾期考試結果:', result);
  });

  it('應該能夠發送逾期通知', async () => {
    const result = await sendOverdueNotifications();
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.notificationsSent).toBe('number');
    expect(typeof result.pendingNotifications).toBe('number');
    
    console.log('✅ 發送逾期通知結果:', result);
  });

  it('應該能夠查詢逾期通知歷史記錄', async () => {
    const result = await getOverdueNotificationHistory({ limit: 10 });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    console.log('✅ 查詢逾期通知歷史記錄:', result.length, '筆');
  });

  it('應該能夠取得逾期通知統計資料', async () => {
    const result = await getOverdueNotificationStats();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    console.log('✅ 逾期通知統計資料:', result);
  });
});

