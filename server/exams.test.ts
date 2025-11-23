import { describe, it, expect, beforeAll } from 'vitest';
import { createExam, batchAddExamQuestions, getExamQuestions } from './db';

describe('Exam Management - Create Exam Wizard', () => {
  let testExamId: number;

  beforeAll(async () => {
    // 確保資料庫連接可用
    const { getDb } = await import('./db');
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }
  });

  it('should create an exam with basic information', async () => {
    const examData = {
      title: '測試考試',
      description: '這是一個測試考試',
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
      gradingMethod: 'auto' as const,
      status: 'draft' as const,
      createdBy: 1, // 假設管理員ID為1
    };

    const result = await createExam(examData);
    
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.title).toBe(examData.title);
    expect(result.timeLimit).toBe(examData.timeLimit);
    
    testExamId = result.id;
  });

  it('should batch add questions to exam', async () => {
    const questions = [
      { questionId: 1, questionOrder: 1, points: 10 },
      { questionId: 2, questionOrder: 2, points: 15 },
      { questionId: 3, questionOrder: 3, points: 20 },
    ];

    await expect(
      batchAddExamQuestions(testExamId, questions)
    ).resolves.not.toThrow();
  });

  it('should retrieve exam questions in correct order', async () => {
    const examQuestions = await getExamQuestions(testExamId);
    
    expect(examQuestions).toBeDefined();
    expect(examQuestions.length).toBe(3);
    
    // 驗證順序
    expect(examQuestions[0].questionOrder).toBe(1);
    expect(examQuestions[1].questionOrder).toBe(2);
    expect(examQuestions[2].questionOrder).toBe(3);
    
    // 驗證分數
    expect(examQuestions[0].points).toBe(10);
    expect(examQuestions[1].points).toBe(15);
    expect(examQuestions[2].points).toBe(20);
  });

  it('should calculate total score correctly', async () => {
    const examQuestions = await getExamQuestions(testExamId);
    const totalScore = examQuestions.reduce((sum, q) => sum + q.points, 0);
    
    expect(totalScore).toBe(45); // 10 + 15 + 20
  });
});

