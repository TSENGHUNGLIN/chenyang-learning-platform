import { getDb } from "./db";
import { examScores, exams, examAssignments } from "../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/**
 * 獲取使用者的成績趨勢資料
 */
export async function getUserPerformanceTrend(userId: number, options?: {
  days?: number; // 最近幾天的資料（7, 30, 90, 或 null 表示全部）
  isPractice?: boolean; // 是否只看模擬練習（null 表示全部）
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 構建查詢條件
    let whereConditions = [eq(examAssignments.userId, userId)];

    // 時間範圍篩選
    if (options?.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - options.days);
      whereConditions.push(gte(examScores.submittedAt, startDate));
    }

    // 模擬/正式篩選
    if (options?.isPractice !== undefined) {
      whereConditions.push(eq(examAssignments.isPractice, options.isPractice ? 1 : 0));
    }

    // 查詢成績資料
    const scores = await db
      .select({
        scoreId: examScores.id,
        examId: exams.id,
        examTitle: exams.title,
        score: examScores.score,
        totalScore: examScores.totalScore,
        passingScore: exams.passingScore,
        submittedAt: examScores.submittedAt,
        isPractice: examAssignments.isPractice,
      })
      .from(examScores)
      .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
      .innerJoin(exams, eq(examAssignments.examId, exams.id))
      .where(and(...whereConditions))
      .orderBy(desc(examScores.submittedAt));

    return scores;
  } catch (error) {
    console.error("Failed to get user performance trend:", error);
    throw error;
  }
}

/**
 * 獲取使用者的成績統計摘要
 */
export async function getUserPerformanceStats(userId: number, options?: {
  days?: number;
  isPractice?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 構建查詢條件
    let whereConditions = [eq(examAssignments.userId, userId)];

    // 時間範圍篩選
    if (options?.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - options.days);
      whereConditions.push(gte(examScores.submittedAt, startDate));
    }

    // 模擬/正式篩選
    if (options?.isPractice !== undefined) {
      whereConditions.push(eq(examAssignments.isPractice, options.isPractice ? 1 : 0));
    }

    // 統計資料
    const statsResult = await db
      .select({
        totalExams: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${examScores.score})`,
        maxScore: sql<number>`MAX(${examScores.score})`,
        minScore: sql<number>`MIN(${examScores.score})`,
        passCount: sql<number>`SUM(CASE WHEN ${examScores.score} >= ${exams.passingScore} THEN 1 ELSE 0 END)`,
      })
      .from(examScores)
      .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
      .innerJoin(exams, eq(examAssignments.examId, exams.id))
      .where(and(...whereConditions));

    const stats = statsResult[0];

    // 計算及格率
    const passRate = stats.totalExams > 0 
      ? ((stats.passCount / stats.totalExams) * 100).toFixed(1) 
      : "0";

    // 計算進步幅度（最近一次 vs 第一次）
    const scoresForTrend = await db
      .select({
        score: examScores.score,
        submittedAt: examScores.submittedAt,
      })
      .from(examScores)
      .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
      .where(and(...whereConditions))
      .orderBy(examScores.submittedAt);

    let improvement = 0;
    if (scoresForTrend.length >= 2) {
      const firstScore = scoresForTrend[0].score;
      const lastScore = scoresForTrend[scoresForTrend.length - 1].score;
      improvement = lastScore - firstScore;
    }

    return {
      totalExams: stats.totalExams,
      avgScore: stats.avgScore ? parseFloat(stats.avgScore.toFixed(1)) : 0,
      maxScore: stats.maxScore || 0,
      minScore: stats.minScore || 0,
      passCount: stats.passCount,
      passRate: parseFloat(passRate),
      improvement,
    };
  } catch (error) {
    console.error("Failed to get user performance stats:", error);
    throw error;
  }
}

/**
 * 獲取使用者的成績分布（用於圖表）
 */
export async function getUserScoreDistribution(userId: number, options?: {
  days?: number;
  isPractice?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 構建查詢條件
    let whereConditions = [eq(examAssignments.userId, userId)];

    // 時間範圍篩選
    if (options?.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - options.days);
      whereConditions.push(gte(examScores.submittedAt, startDate));
    }

    // 模擬/正式篩選
    if (options?.isPractice !== undefined) {
      whereConditions.push(eq(examAssignments.isPractice, options.isPractice ? 1 : 0));
    }

    // 查詢成績分布（按分數區間統計）
    const distribution = await db
      .select({
        scoreRange: sql<string>`
          CASE 
            WHEN ${examScores.score} >= 90 THEN '90-100'
            WHEN ${examScores.score} >= 80 THEN '80-89'
            WHEN ${examScores.score} >= 70 THEN '70-79'
            WHEN ${examScores.score} >= 60 THEN '60-69'
            ELSE '0-59'
          END
        `,
        count: sql<number>`COUNT(*)`,
      })
      .from(examScores)
      .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
      .where(and(...whereConditions))
      .groupBy(sql`
        CASE 
          WHEN ${examScores.score} >= 90 THEN '90-100'
          WHEN ${examScores.score} >= 80 THEN '80-89'
          WHEN ${examScores.score} >= 70 THEN '70-79'
          WHEN ${examScores.score} >= 60 THEN '60-69'
          ELSE '0-59'
        END
      `);

    return distribution;
  } catch (error) {
    console.error("Failed to get user score distribution:", error);
    throw error;
  }
}

