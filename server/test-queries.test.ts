import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { exams, examScores, examAssignments, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('test individual queries', () => {
  it('should query exam basic info', async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const examData = await db
      .select()
      .from(exams)
      .where(eq(exams.id, 210006))
      .limit(1);
    
    console.log('Exam data:', examData);
    expect(examData).toBeDefined();
  });

  it('should query exam scores', async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    try {
      const scores = await db
        .select({
          scoreId: examScores.id,
          score: examScores.totalScore,
          totalScore: examScores.maxScore,
          percentage: examScores.percentage,
          isPassed: examScores.passed,
        })
        .from(examScores)
        .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
        .where(eq(examAssignments.examId, 210006))
        .limit(5);
      
      console.log('Scores:', scores);
      expect(scores).toBeDefined();
    } catch (error) {
      console.error('Error querying scores:', error);
      throw error;
    }
  });

  it('should query wrong answers', async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const { examSubmissions, examAssignments, questions: questionsTable } = await import('../drizzle/schema');
    const { sql, desc } = await import('drizzle-orm');
    
    try {
      const wrongAnswers = await db
        .select({
          questionId: examSubmissions.questionId,
          question: questionsTable.question,
          questionType: questionsTable.type,
          totalAttempts: sql<number>`COUNT(*)`,
          wrongAttempts: sql<number>`SUM(CASE WHEN ${examSubmissions.isCorrect} = 0 THEN 1 ELSE 0 END)`,
          errorRate: sql<number>`(SUM(CASE WHEN ${examSubmissions.isCorrect} = 0 THEN 1 ELSE 0 END) / COUNT(*) * 100)`,
        })
        .from(examSubmissions)
        .innerJoin(examAssignments, eq(examSubmissions.assignmentId, examAssignments.id))
        .innerJoin(questionsTable, eq(examSubmissions.questionId, questionsTable.id))
        .where(eq(examAssignments.examId, 210006))
        .groupBy(examSubmissions.questionId, questionsTable.question, questionsTable.type)
        .orderBy(desc(sql`(SUM(CASE WHEN ${examSubmissions.isCorrect} = 0 THEN 1 ELSE 0 END) / COUNT(*) * 100)`))
        .limit(10);
      
      console.log('Wrong answers:', wrongAnswers);
      expect(wrongAnswers).toBeDefined();
    } catch (error) {
      console.error('Error querying wrong answers:', error);
      throw error;
    }
  });
});
