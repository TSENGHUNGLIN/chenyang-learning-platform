import { describe, it, expect, beforeAll } from 'vitest';
import { checkQuestionsQuality, fixOptionsFormat } from './dataQualityCheck';
import { getDb } from './db';

describe('資料品質檢查功能', () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for testing');
    }
  });

  it('應該能夠檢查題目資料品質', async () => {
    const result = await checkQuestionsQuality();
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('totalQuestions');
    expect(result).toHaveProperty('invalidOptionsQuestions');
    expect(result).toHaveProperty('missingFieldsQuestions');
    
    expect(typeof result.totalQuestions).toBe('number');
    expect(Array.isArray(result.invalidOptionsQuestions)).toBe(true);
    expect(Array.isArray(result.missingFieldsQuestions)).toBe(true);
    
    console.log('✅ 檢查結果：');
    console.log(`   總題目數: ${result.totalQuestions}`);
    console.log(`   選項格式錯誤: ${result.invalidOptionsQuestions.length}`);
    console.log(`   缺少必要欄位: ${result.missingFieldsQuestions.length}`);
  });

  it('應該能夠修復選項格式問題', async () => {
    const result = await fixOptionsFormat();
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('fixedCount');
    expect(typeof result.fixedCount).toBe('number');
    
    console.log(`✅ 修復結果：已修復 ${result.fixedCount} 道題目`);
  });

  it('修復後應該沒有選項格式錯誤', async () => {
    // 先執行修復
    await fixOptionsFormat();
    
    // 再次檢查
    const result = await checkQuestionsQuality();
    
    // 驗證所有選擇題的選項都是陣列格式
    expect(result.invalidOptionsQuestions.length).toBe(0);
    
    console.log('✅ 修復後驗證：所有選項格式正確');
  });
});

