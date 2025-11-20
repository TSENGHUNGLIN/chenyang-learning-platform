/**
 * 考試監控模組
 * 提供即時監控考試狀態、考生進度和系統效能的功能
 */

import { getDb } from "./db";
import { exams, examAssignments, examSubmissions, users, employees } from "../drizzle/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";

/**
 * 獲取所有進行中的考試
 * 包含考試詳情、考生列表和答題進度
 */
export async function getOngoingExams() {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  const now = new Date();

  // 查詢所有已發布的考試
  const publishedExams = await db
    .select()
    .from(exams)
    .where(eq(exams.status, "published"));

  // 篩選出有進行中指派的考試
  const ongoingExamsList = [];
  for (const exam of publishedExams) {
    // 查詢該考試是否有進行中的指派（status = 'in_progress' 或 'pending' 且在 deadline 之前）
    const activeAssignments = await db
      .select({ count: sql<number>`count(*)` })
      .from(examAssignments)
      .where(
        and(
          eq(examAssignments.examId, exam.id),
          sql`${examAssignments.status} IN ('pending', 'in_progress')`
        )
      );
    
    if (Number(activeAssignments[0]?.count || 0) > 0) {
      ongoingExamsList.push(exam);
    }
  }

  // 為每個考試載入考生資訊和進度
  const examsWithDetails = await Promise.all(
    ongoingExamsList.map(async (exam) => {
      // 獲取該考試的所有指派記錄
      const assignments = await db
        .select({
          id: examAssignments.id,
          userId: examAssignments.userId,
          status: examAssignments.status,
          startTime: examAssignments.startTime,
          endTime: examAssignments.endTime,
          userName: users.name,
          userEmail: users.email,
        })
        .from(examAssignments)
        .leftJoin(users, eq(examAssignments.userId, users.id))
        .where(eq(examAssignments.examId, exam.id));

      // 為每個考生計算答題進度
      const examineesWithProgress = await Promise.all(
        assignments.map(async (assignment) => {
          // 獲取該考生的答題記錄
          const submissions = await db
            .select()
            .from(examSubmissions)
            .where(eq(examSubmissions.assignmentId, assignment.id));

          // 計算總題數（從exam中獲取）
          const totalQuestions = exam.totalScore || 100; // 暫時使用totalScore作為題數，實際應該查詢examQuestions表

          // 計算已答題數
          const answeredCount = submissions.filter((s) => s.answer !== null && s.answer !== "").length;

          // 計算進度百分比
          const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

          return {
            id: assignment.userId,
            name: assignment.userName || "未知",
            email: assignment.userEmail || "",
            status: assignment.status,
            progress,
            answeredCount,
            totalQuestions,
            startTime: assignment.startTime,
            endTime: assignment.endTime,
          };
        })
      );

      // 計算整體完成率
      const completedCount = examineesWithProgress.filter((e) => e.status === "completed").length;
      const totalExaminees = examineesWithProgress.length;
      const completionRate = totalExaminees > 0 ? Math.round((completedCount / totalExaminees) * 100) : 0;

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        status: exam.status,
        totalExaminees,
        completedCount,
        completionRate,
        examinees: examineesWithProgress,
      };
    })
  );

  return examsWithDetails;
}

/**
 * 獲取考試監控統計資料
 * 包含進行中考試數、應考人數、完成人數、平均進度等
 */
export async function getMonitoringStats() {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  const now = new Date();

  // 查詢所有已發布的考試
  const publishedExams = await db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.status, "published"));

  const examIds = publishedExams.map((e) => e.id);

  // 篩選出有進行中指派的考試
  const ongoingExamIds = [];
  for (const examId of examIds) {
    const activeAssignments = await db
      .select({ count: sql<number>`count(*)` })
      .from(examAssignments)
      .where(
        and(
          eq(examAssignments.examId, examId),
          sql`${examAssignments.status} IN ('pending', 'in_progress')`
        )
      );
    
    if (Number(activeAssignments[0]?.count || 0) > 0) {
      ongoingExamIds.push(examId);
    }
  }

  const ongoingCount = ongoingExamIds.length;

  if (ongoingExamIds.length === 0) {
    return {
      ongoingCount: 0,
      totalExaminees: 0,
      completedCount: 0,
      averageProgress: 0,
      avgResponseTime: 0,
    };
  }

  // 查詢應考人數（進行中考試的指派記錄）
  const totalExamineesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(examAssignments)
    .where(sql`${examAssignments.examId} IN (${sql.join(ongoingExamIds.map((id) => sql`${id}`), sql`, `)})`);

  const totalExaminees = Number(totalExamineesResult[0]?.count || 0);

  // 查詢已完成人數
  const completedCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(examAssignments)
    .where(
      and(
        sql`${examAssignments.examId} IN (${sql.join(ongoingExamIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(examAssignments.status, "completed")
      )
    );

  const completedCount = Number(completedCountResult[0]?.count || 0);

  // 計算平均進度（簡化版，實際應該計算每個考生的答題進度）
  const averageProgress = totalExaminees > 0 ? Math.round((completedCount / totalExaminees) * 100) : 0;

  // 系統效能指標（預留，實際應該從監控系統獲取）
  const avgResponseTime = 150; // 毫秒

  return {
    ongoingCount,
    totalExaminees,
    completedCount,
    averageProgress,
    avgResponseTime,
  };
}

