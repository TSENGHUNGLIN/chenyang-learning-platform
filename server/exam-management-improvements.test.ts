import { describe, it, expect } from 'vitest';

/**
 * 考試管理系統優化測試
 * 測試項目：
 * 1. 考試狀態邏輯（草稿/已發布/進行中/已結束）
 * 2. 按鈕顯示邏輯（根據考試狀態）
 * 3. 空資料處理邏輯
 */

describe('考試狀態管理', () => {
  // 模擬 getExamStatus 函數
  const getExamStatus = (exam: any) => {
    if (exam.status === 'draft') {
      return { text: '草稿', variant: 'secondary' as const, key: 'draft' };
    }
    if (exam.status === 'archived') {
      return { text: '已封存', variant: 'outline' as const, key: 'archived' };
    }
    
    // 已發布的考試，需要根據時間判斷狀態
    const now = new Date();
    const startTime = exam.startTime ? new Date(exam.startTime) : null;
    const endTime = exam.endTime ? new Date(exam.endTime) : null;
    
    if (startTime && endTime) {
      if (now < startTime) {
        return { text: '已發布', variant: 'default' as const, key: 'published' };
      } else if (now >= startTime && now <= endTime) {
        return { text: '進行中', variant: 'default' as const, key: 'ongoing' };
      } else {
        return { text: '已結束', variant: 'outline' as const, key: 'ended' };
      }
    }
    
    // 如果沒有設定時間，則顯示已發布
    return { text: '已發布', variant: 'default' as const, key: 'published' };
  };

  it('應該正確識別草稿狀態', () => {
    const exam = { status: 'draft' };
    const result = getExamStatus(exam);
    expect(result.key).toBe('draft');
    expect(result.text).toBe('草稿');
    expect(result.variant).toBe('secondary');
  });

  it('應該正確識別已封存狀態', () => {
    const exam = { status: 'archived' };
    const result = getExamStatus(exam);
    expect(result.key).toBe('archived');
    expect(result.text).toBe('已封存');
    expect(result.variant).toBe('outline');
  });

  it('應該正確識別已發布但未開始的考試', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7天後
    const endDate = new Date(futureDate);
    endDate.setDate(endDate.getDate() + 1); // 8天後
    
    const exam = {
      status: 'published',
      startTime: futureDate.toISOString(),
      endTime: endDate.toISOString(),
    };
    const result = getExamStatus(exam);
    expect(result.key).toBe('published');
    expect(result.text).toBe('已發布');
  });

  it('應該正確識別進行中的考試', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1天前
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // 1天後
    
    const exam = {
      status: 'published',
      startTime: pastDate.toISOString(),
      endTime: futureDate.toISOString(),
    };
    const result = getExamStatus(exam);
    expect(result.key).toBe('ongoing');
    expect(result.text).toBe('進行中');
  });

  it('應該正確識別已結束的考試', () => {
    const pastStartDate = new Date();
    pastStartDate.setDate(pastStartDate.getDate() - 7); // 7天前
    const pastEndDate = new Date();
    pastEndDate.setDate(pastEndDate.getDate() - 1); // 1天前
    
    const exam = {
      status: 'published',
      startTime: pastStartDate.toISOString(),
      endTime: pastEndDate.toISOString(),
    };
    const result = getExamStatus(exam);
    expect(result.key).toBe('ended');
    expect(result.text).toBe('已結束');
  });

  it('應該處理沒有時間設定的已發布考試', () => {
    const exam = { status: 'published' };
    const result = getExamStatus(exam);
    expect(result.key).toBe('published');
    expect(result.text).toBe('已發布');
  });
});

describe('按鈕顯示邏輯', () => {
  // 模擬按鈕顯示邏輯
  const shouldShowButton = (buttonType: string, examStatus: string) => {
    switch (buttonType) {
      case 'preview':
        return true; // 所有狀態都顯示預覽按鈕
      case 'statistics':
      case 'analytics':
        return examStatus !== 'draft'; // 非草稿狀態顯示統計和分析
      case 'reviewEdit':
        return examStatus !== 'draft'; // 非草稿狀態顯示審查編輯
      case 'quickEdit':
        return examStatus === 'draft'; // 草稿狀態顯示快速編輯
      case 'assign':
        return true; // 所有狀態都顯示指派考生
      case 'delete':
        return examStatus === 'draft'; // 草稿狀態才可刪除
      default:
        return false;
    }
  };

  it('草稿狀態應該顯示：預覽、快速編輯、指派考生、刪除', () => {
    const status = 'draft';
    expect(shouldShowButton('preview', status)).toBe(true);
    expect(shouldShowButton('statistics', status)).toBe(false);
    expect(shouldShowButton('analytics', status)).toBe(false);
    expect(shouldShowButton('reviewEdit', status)).toBe(false);
    expect(shouldShowButton('quickEdit', status)).toBe(true);
    expect(shouldShowButton('assign', status)).toBe(true);
    expect(shouldShowButton('delete', status)).toBe(true);
  });

  it('已發布狀態應該顯示：預覽、統計、分析、審查編輯、指派考生', () => {
    const status = 'published';
    expect(shouldShowButton('preview', status)).toBe(true);
    expect(shouldShowButton('statistics', status)).toBe(true);
    expect(shouldShowButton('analytics', status)).toBe(true);
    expect(shouldShowButton('reviewEdit', status)).toBe(true);
    expect(shouldShowButton('quickEdit', status)).toBe(false);
    expect(shouldShowButton('assign', status)).toBe(true);
    expect(shouldShowButton('delete', status)).toBe(false);
  });

  it('進行中狀態應該顯示：預覽、統計、分析、審查編輯、指派考生', () => {
    const status = 'ongoing';
    expect(shouldShowButton('preview', status)).toBe(true);
    expect(shouldShowButton('statistics', status)).toBe(true);
    expect(shouldShowButton('analytics', status)).toBe(true);
    expect(shouldShowButton('reviewEdit', status)).toBe(true);
    expect(shouldShowButton('quickEdit', status)).toBe(false);
    expect(shouldShowButton('assign', status)).toBe(true);
    expect(shouldShowButton('delete', status)).toBe(false);
  });

  it('已結束狀態應該顯示：預覽、統計、分析、審查編輯、指派考生', () => {
    const status = 'ended';
    expect(shouldShowButton('preview', status)).toBe(true);
    expect(shouldShowButton('statistics', status)).toBe(true);
    expect(shouldShowButton('analytics', status)).toBe(true);
    expect(shouldShowButton('reviewEdit', status)).toBe(true);
    expect(shouldShowButton('quickEdit', status)).toBe(false);
    expect(shouldShowButton('assign', status)).toBe(true);
    expect(shouldShowButton('delete', status)).toBe(false);
  });
});

describe('空資料處理邏輯', () => {
  it('應該正確判斷有考生資料', () => {
    const statistics = { totalStudents: 5, averageScore: 75, passedCount: 4, passRate: 80 };
    const hasStudentData = statistics.totalStudents > 0;
    expect(hasStudentData).toBe(true);
  });

  it('應該正確判斷沒有考生資料', () => {
    const statistics = { totalStudents: 0, averageScore: 0, passedCount: 0, passRate: 0 };
    const hasStudentData = statistics.totalStudents > 0;
    expect(hasStudentData).toBe(false);
  });

  it('應該處理 undefined 統計資料', () => {
    const statistics = undefined;
    const safeStatistics = statistics || { totalStudents: 0, averageScore: 0, passedCount: 0, passRate: 0 };
    const hasStudentData = safeStatistics.totalStudents > 0;
    expect(hasStudentData).toBe(false);
  });
});

