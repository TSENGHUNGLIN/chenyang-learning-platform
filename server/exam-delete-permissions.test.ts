import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';

/**
 * 考試刪除權限控制測試
 * 
 * 測試目標：
 * 1. 管理員可以刪除已發布的考試
 * 2. 編輯者無法刪除已發布的考試
 * 3. 編輯者和管理員都可以刪除草稿狀態的考試
 * 4. 刪除不存在的考試會返回錯誤
 */

describe('考試刪除權限控制', () => {
  let testExamId: number;
  let draftExamId: number;

  // 建立測試用的考試
  beforeAll(async () => {
    const adminContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: '測試管理員',
        role: 'admin',
        email: 'admin@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const adminCaller = appRouter.createCaller(adminContext);

    // 建立已發布的測試考試
    const publishedExam = await adminCaller.exams.create({
      title: '測試考試 - 權限控制',
      description: '用於測試刪除權限的考試',
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
      status: 'published',
    });
    testExamId = publishedExam.id;

    // 建立草稿狀態的測試考試
    const draftExam = await adminCaller.exams.create({
      title: '測試考試 - 草稿',
      description: '用於測試刪除草稿的考試',
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
      status: 'draft',
    });
    draftExamId = draftExam.id;
  });

  it('管理員可以刪除已發布的考試', async () => {
    const adminContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: '測試管理員',
        role: 'admin',
        email: 'admin@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const adminCaller = appRouter.createCaller(adminContext);

    // 建立一個新的已發布考試用於刪除
    const examToDelete = await adminCaller.exams.create({
      title: '待刪除的已發布考試',
      description: '用於測試管理員刪除權限',
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
      status: 'published',
    });

    // 管理員應該可以刪除已發布的考試
    const result = await adminCaller.exams.delete(examToDelete.id);
    expect(result.success).toBe(true);

    // 驗證考試已被刪除
    const exams = await adminCaller.exams.list();
    const deletedExam = exams.find((e: any) => e.id === examToDelete.id);
    expect(deletedExam).toBeUndefined();
  });

  it('編輯者無法刪除已發布的考試', async () => {
    const editorContext = {
      user: {
        id: 2,
        openId: 'test-editor',
        name: '測試編輯者',
        role: 'editor',
        email: 'editor@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const editorCaller = appRouter.createCaller(editorContext);

    // 編輯者嘗試刪除已發布的考試應該失敗
    await expect(async () => {
      await editorCaller.exams.delete(testExamId);
    }).rejects.toThrow('已發布的考試只有管理員可以刪除');
  });

  it('編輯者可以刪除草稿狀態的考試', async () => {
    const editorContext = {
      user: {
        id: 2,
        openId: 'test-editor',
        name: '測試編輯者',
        role: 'editor',
        email: 'editor@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const editorCaller = appRouter.createCaller(editorContext);

    // 建立一個新的草稿考試用於刪除
    const adminContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: '測試管理員',
        role: 'admin',
        email: 'admin@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const adminCaller = appRouter.createCaller(adminContext);
    const draftExam = await adminCaller.exams.create({
      title: '待刪除的草稿考試',
      description: '用於測試編輯者刪除草稿權限',
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
      status: 'draft',
    });

    // 編輯者應該可以刪除草稿考試
    const result = await editorCaller.exams.delete(draftExam.id);
    expect(result.success).toBe(true);

    // 驗證考試已被刪除
    const exams = await adminCaller.exams.list();
    const deletedExam = exams.find((e: any) => e.id === draftExam.id);
    expect(deletedExam).toBeUndefined();
  });

  it('管理員可以刪除草稿狀態的考試', async () => {
    const adminContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: '測試管理員',
        role: 'admin',
        email: 'admin@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const adminCaller = appRouter.createCaller(adminContext);

    // 建立一個新的草稿考試用於刪除
    const draftExam = await adminCaller.exams.create({
      title: '待刪除的草稿考試（管理員）',
      description: '用於測試管理員刪除草稿權限',
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
      status: 'draft',
    });

    // 管理員應該可以刪除草稿考試
    const result = await adminCaller.exams.delete(draftExam.id);
    expect(result.success).toBe(true);

    // 驗證考試已被刪除
    const exams = await adminCaller.exams.list();
    const deletedExam = exams.find((e: any) => e.id === draftExam.id);
    expect(deletedExam).toBeUndefined();
  });

  it('刪除不存在的考試會返回錯誤', async () => {
    const adminContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: '測試管理員',
        role: 'admin',
        email: 'admin@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const adminCaller = appRouter.createCaller(adminContext);

    // 嘗試刪除不存在的考試
    await expect(async () => {
      await adminCaller.exams.delete(999999);
    }).rejects.toThrow('考試不存在');
  });

  it('沒有編輯權限的使用者無法刪除任何考試', async () => {
    const viewerContext = {
      user: {
        id: 3,
        openId: 'test-viewer',
        name: '測試觀看者',
        role: 'viewer',
        email: 'viewer@test.com',
      },
      req: {} as any,
      res: {} as any,
    } as Context;

    const viewerCaller = appRouter.createCaller(viewerContext);

    // 觀看者嘗試刪除考試應該失敗
    await expect(async () => {
      await viewerCaller.exams.delete(draftExamId);
    }).rejects.toThrow('沒有權限');
  });
});

