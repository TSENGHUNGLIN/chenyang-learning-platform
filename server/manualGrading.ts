import { getDb } from "./db";
import { eq } from "drizzle-orm";

/**
 * 人工評分功能模組
 */

/**
 * 更新單題的人工評分
 */
export async function updateManualScore(params: {
  submissionId: number;
  score: number;
  teacherComment?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { examSubmissions } = await import("../drizzle/schema");

  // 更新該題的分數和評語
  await db
    .update(examSubmissions)
    .set({
      score: params.score,
      teacherComment: params.teacherComment || null,
    })
    .where(eq(examSubmissions.id, params.submissionId));

  return { success: true };
}

/**
 * 重新計算考試總分（在人工評分後調用）
 */
export async function recalculateExamScore(assignmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    examSubmissions,
    examScores,
    examAssignments,
    exams,
  } = await import("../drizzle/schema");

  // 取得該考試的所有作答記錄
  const submissions = await db
    .select()
    .from(examSubmissions)
    .where(eq(examSubmissions.assignmentId, assignmentId));

  // 取得考試資訊
  const assignment = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.id, assignmentId))
    .limit(1);

  if (assignment.length === 0) {
    throw new Error(`Assignment ${assignmentId} not found`);
  }

  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, assignment[0].examId))
    .limit(1);

  if (examResult.length === 0) {
    throw new Error(`Exam ${assignment[0].examId} not found`);
  }

  const exam = examResult[0];

  // 計算總分
  const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
  const maxScore = exam.totalScore || 100;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= (exam.passingScore || 60) ? 1 : 0;

  // 更新或插入成績記錄
  const existingScore = await db
    .select()
    .from(examScores)
    .where(eq(examScores.assignmentId, assignmentId))
    .limit(1);

  if (existingScore.length > 0) {
    // 更新現有成績
    await db
      .update(examScores)
      .set({
        totalScore,
        maxScore,
        percentage,
        passed,
        gradedAt: new Date(),
      })
      .where(eq(examScores.assignmentId, assignmentId));
  } else {
    // 插入新成績
    await db.insert(examScores).values({
      assignmentId,
      totalScore,
      maxScore,
      percentage,
      passed,
      gradedAt: new Date(),
    });
  }

  // 更新考試狀態為已評分
  await db
    .update(examAssignments)
    .set({
      status: "graded",
    })
    .where(eq(examAssignments.id, assignmentId));

  return {
    totalScore,
    maxScore,
    percentage,
    passed: passed === 1,
  };
}

