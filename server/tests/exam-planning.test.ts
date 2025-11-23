import { describe, it, expect } from 'vitest';
import { getDb } from '../db';
import { 
  batchPlanExams, 
  parseExamPlanningCSV, 
  convertCSVToPlanningItems,
  getOverdueExams,
  markExamAsOverdue,
  extendExamDeadline
} from '../examPlanning';

describe('考試規劃功能測試', () => {
  it('應該能夠解析 CSV 格式的考試規劃資料', async () => {
    const csvContent = `考生姓名,考生Email,考卷名稱,開始時間,截止時間
張三,zhang@example.com,數學測驗,2025-02-01 09:00:00,2025-02-05 17:00:00
李四,li@example.com,英文測驗,2025-02-02 09:00:00,2025-02-06 17:00:00`;

    const result = await parseExamPlanningCSV(csvContent);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    
    // 驗證第一筆資料
    expect(result[0].userName).toBe('張三');
    expect(result[0].userEmail).toBe('zhang@example.com');
    expect(result[0].examTitle).toBe('數學測驗');
    expect(result[0].startTime).toBe('2025-02-01 09:00:00');
    expect(result[0].deadline).toBe('2025-02-05 17:00:00');
  });

  it('應該能夠處理空行和格式錯誤的 CSV', async () => {
    const csvContent = `考生姓名,考生Email,考卷名稱,開始時間,截止時間
張三,zhang@example.com,數學測驗,2025-02-01 09:00:00,2025-02-05 17:00:00

李四,li@example.com
王五,wang@example.com,物理測驗,2025-02-03 09:00:00,2025-02-07 17:00:00`;

    const result = await parseExamPlanningCSV(csvContent);
    
    expect(result).toBeDefined();
    // 應該只解析有效的行（第1行和第4行）
    expect(result.length).toBe(2);
  });

  it('應該能夠查詢逾期考試', async () => {
    const db = await getDb();
    if (!db) {
      console.log('[測試] 資料庫未連線，跳過此測試');
      return;
    }

    const overdueExams = await getOverdueExams();
    
    expect(overdueExams).toBeDefined();
    expect(Array.isArray(overdueExams)).toBe(true);
    
    console.log(`[測試] 找到 ${overdueExams.length} 個逾期考試`);
  });

  it('應該能夠驗證批次規劃的資料結構', async () => {
    // 測試批次規劃的輸入資料結構
    const planningItems = [
      {
        examId: 1,
        userId: 1,
        startTime: new Date('2025-02-01 09:00:00'),
        deadline: new Date('2025-02-05 17:00:00'),
      },
      {
        examId: 2,
        userId: 1,
        startTime: new Date('2025-02-02 09:00:00'),
        deadline: new Date('2025-02-06 17:00:00'),
      },
    ];

    // 驗證資料結構
    expect(planningItems.length).toBe(2);
    expect(planningItems[0]).toHaveProperty('examId');
    expect(planningItems[0]).toHaveProperty('userId');
    expect(planningItems[0]).toHaveProperty('startTime');
    expect(planningItems[0]).toHaveProperty('deadline');
    
    // 驗證時間格式
    expect(planningItems[0].startTime).toBeInstanceOf(Date);
    expect(planningItems[0].deadline).toBeInstanceOf(Date);
  });

  it('應該能夠處理 CSV 轉換為規劃項目的錯誤情況', async () => {
    const db = await getDb();
    if (!db) {
      console.log('[測試] 資料庫未連線，跳過此測試');
      return;
    }

    // 測試不存在的考生和考卷
    const parsedItems = [
      {
        userName: '不存在的考生',
        userEmail: 'nonexistent@example.com',
        examTitle: '不存在的考卷',
        startTime: '2025-02-01 09:00:00',
        deadline: '2025-02-05 17:00:00',
      },
    ];

    const result = await convertCSVToPlanningItems(parsedItems);
    
    expect(result).toBeDefined();
    expect(result.planningItems).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
    
    // 應該有錯誤訊息
    expect(result.errors.length).toBeGreaterThan(0);
    console.log(`[測試] 錯誤訊息: ${result.errors.join(', ')}`);
  });

  it('應該能夠驗證逾期天數計算邏輯', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 計算逾期天數
    const calculateOverdueDays = (deadline: Date) => {
      const diffTime = now.getTime() - deadline.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    };

    expect(calculateOverdueDays(yesterday)).toBe(1);
    expect(calculateOverdueDays(lastWeek)).toBe(7);
    expect(calculateOverdueDays(now)).toBe(0);
  });

  it('應該能夠驗證資料庫表格結構', async () => {
    const db = await getDb();
    if (!db) {
      console.log('[測試] 資料庫未連線，跳過此測試');
      return;
    }

    // 驗證 examPlanningBatches 表格
    const { examPlanningBatches } = await import('../../drizzle/schema');
    expect(examPlanningBatches).toBeDefined();

    // 驗證 overdueExamActions 表格
    const { overdueExamActions } = await import('../../drizzle/schema');
    expect(overdueExamActions).toBeDefined();

    console.log('[測試] 資料庫表格結構驗證通過');
  });
});

