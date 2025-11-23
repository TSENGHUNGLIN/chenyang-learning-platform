import { describe, it, expect } from 'vitest';
import { createExamPlanningTemplate, getExamPlanningTemplates, getExamPlanningTemplateDetail, updateExamPlanningTemplate, deleteExamPlanningTemplate, exportTemplateAsJSON, importTemplateFromJSON } from '../server/db';

describe('考試規劃範本測試', () => {
  let createdTemplateId: number;

  it('應該能夠建立考試規劃範本', async () => {
    const result = await createExamPlanningTemplate({
      name: '測試範本',
      description: '這是一個測試範本',
      category: '測試',
      isPublic: true,
      createdBy: 1,
      items: [
        {
          examId: 1,
          orderIndex: 0,
          daysFromStart: 0,
          durationDays: 7,
          notes: '第一週考試',
        },
        {
          examId: 2,
          orderIndex: 1,
          daysFromStart: 7,
          durationDays: 7,
          notes: '第二週考試',
        },
      ],
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.templateId).toBe('number');
    
    createdTemplateId = result.templateId;
    console.log('✅ 建立範本結果:', result);
  });

  it('應該能夠查詢範本列表', async () => {
    const result = await getExamPlanningTemplates();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    console.log('✅ 查詢範本列表:', result.length, '筆');
  });

  it('應該能夠查詢範本詳情', async () => {
    if (!createdTemplateId) {
      console.log('⚠️ 跳過測試：沒有可用的範本ID');
      return;
    }

    const result = await getExamPlanningTemplateDetail(createdTemplateId);
    
    expect(result).toBeDefined();
    expect(result.id).toBe(createdTemplateId);
    expect(Array.isArray(result.items)).toBe(true);
    
    console.log('✅ 查詢範本詳情:', result);
  });

  it('應該能夠更新範本', async () => {
    if (!createdTemplateId) {
      console.log('⚠️ 跳過測試：沒有可用的範本ID');
      return;
    }

    const result = await updateExamPlanningTemplate(createdTemplateId, {
      name: '更新後的測試範本',
      description: '這是更新後的描述',
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    console.log('✅ 更新範本結果:', result);
  });

  it('應該能夠匯出範本為 JSON', async () => {
    if (!createdTemplateId) {
      console.log('⚠️ 跳過測試：沒有可用的範本ID');
      return;
    }

    const result = await exportTemplateAsJSON(createdTemplateId);
    
    expect(result).toBeDefined();
    expect(result.version).toBe('1.0');
    expect(result.template).toBeDefined();
    
    console.log('✅ 匯出範本 JSON:', result);
  });

  it('應該能夠刪除範本', async () => {
    if (!createdTemplateId) {
      console.log('⚠️ 跳過測試：沒有可用的範本ID');
      return;
    }

    const result = await deleteExamPlanningTemplate(createdTemplateId);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    console.log('✅ 刪除範本結果:', result);
  });
});

