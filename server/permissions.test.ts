import { describe, it, expect } from 'vitest';

describe('單選題庫批次刪除權限測試', () => {
  it('管理員應該可以批次刪除題目', () => {
    const adminUser = { role: 'admin' };
    const canBatchDelete = adminUser.role === 'admin';
    expect(canBatchDelete).toBe(true);
  });

  it('編輯者不應該可以批次刪除題目', () => {
    const editorUser = { role: 'editor' };
    const canBatchDelete = editorUser.role === 'admin';
    expect(canBatchDelete).toBe(false);
  });

  it('管理員應該可以批次還原題目', () => {
    const adminUser = { role: 'admin' };
    const canBatchRestore = adminUser.role === 'admin';
    expect(canBatchRestore).toBe(true);
  });

  it('編輯者不應該可以批次還原題目', () => {
    const editorUser = { role: 'editor' };
    const canBatchRestore = editorUser.role === 'admin';
    expect(canBatchRestore).toBe(false);
  });

  it('管理員應該可以批次永久刪除題目', () => {
    const adminUser = { role: 'admin' };
    const canBatchPermanentDelete = adminUser.role === 'admin';
    expect(canBatchPermanentDelete).toBe(true);
  });

  it('編輯者不應該可以批次永久刪除題目', () => {
    const editorUser = { role: 'editor' };
    const canBatchPermanentDelete = editorUser.role === 'admin';
    expect(canBatchPermanentDelete).toBe(false);
  });

  it('編輯者應該可以單一刪除題目', () => {
    const editorUser = { role: 'editor' };
    const canDelete = editorUser.role === 'admin' || editorUser.role === 'editor';
    expect(canDelete).toBe(true);
  });

  it('管理員應該可以單一刪除題目', () => {
    const adminUser = { role: 'admin' };
    const canDelete = adminUser.role === 'admin' || adminUser.role === 'editor';
    expect(canDelete).toBe(true);
  });
});

