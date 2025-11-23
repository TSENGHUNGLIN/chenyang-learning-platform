import { getDb } from "./db";
import { eq, and, sql } from "drizzle-orm";

/**
 * 考試統計功能模組
 */

/**
 * 取得考試的整體統計資料
 */
export async function getExamStatistics(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    exams,
    examAssignments,
    examScores,
    users,
  } = await import("../drizzle/schema");

  // 取得考試基本資訊
  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  if (examResult.length === 0) {
    throw new Error(`Exam ${examId} not found`);
  }

  const exam = examResult[0];

  // 取得所有考試指派
  const assignments = await db
    .select({
      id: examAssignments.id,
      userId: examAssignments.userId,
      status: examAssignments.status,
      startTime: examAssignments.startTime,
      endTime: examAssignments.endTime,
      assignedAt: examAssignments.assignedAt,
    })
    .from(examAssignments)
    .where(eq(examAssignments.examId, examId));

  // 取得所有成績
  const scores = await db
    .select({
      assignmentId: examScores.assignmentId,
      totalScore: examScores.totalScore,
      maxScore: examScores.maxScore,
      percentage: examScores.percentage,
      passed: examScores.passed,
      gradedAt: examScores.gradedAt,
    })
    .from(examScores)
    .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
    .where(eq(examAssignments.examId, examId));

  // 計算統計數據
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    (a) => a.status === "submitted" || a.status === "graded"
  ).length;
  const inProgressAssignments = assignments.filter(
    (a) => a.status === "in_progress"
  ).length;
  const pendingAssignments = assignments.filter(
    (a) => a.status === "pending"
  ).length;

  const totalGraded = scores.length;
  const passedCount = scores.filter((s) => s.passed === 1).length;
  const failedCount = scores.filter((s) => s.passed === 0).length;
  const passRate = totalGraded > 0 ? (passedCount / totalGraded) * 100 : 0;

  const averageScore =
    totalGraded > 0
      ? scores.reduce((sum, s) => sum + s.percentage, 0) / totalGraded
      : 0;

  const highestScore = totalGraded > 0 ? Math.max(...scores.map((s) => s.percentage)) : 0;
  const lowestScore = totalGraded > 0 ? Math.min(...scores.map((s) => s.percentage)) : 0;

  // 分數分布（0-59, 60-69, 70-79, 80-89, 90-100）
  const scoreDistribution = {
    "0-59": scores.filter((s) => s.percentage < 60).length,
    "60-69": scores.filter((s) => s.percentage >= 60 && s.percentage < 70).length,
    "70-79": scores.filter((s) => s.percentage >= 70 && s.percentage < 80).length,
    "80-89": scores.filter((s) => s.percentage >= 80 && s.percentage < 90).length,
    "90-100": scores.filter((s) => s.percentage >= 90).length,
  };

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      passingScore: exam.passingScore,
      totalScore: exam.totalScore,
    },
    overview: {
      totalAssignments,
      completedAssignments,
      inProgressAssignments,
      pendingAssignments,
      totalGraded,
      passedCount,
      failedCount,
      passRate: Math.round(passRate * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      lowestScore,
    },
    scoreDistribution,
  };
}

/**
 * 取得錯題排行榜
 */
export async function getWrongAnswerRanking(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    examAssignments,
    examSubmissions,
    questions,
  } = await import("../drizzle/schema");

  // 查詢所有題目的錯誤率
  const wrongAnswers = await db
    .select({
      questionId: examSubmissions.questionId,
      question: questions.question,
      type: questions.type,
      difficulty: questions.difficulty,
      totalAttempts: sql<number>`COUNT(*)`,
      wrongCount: sql<number>`SUM(CASE WHEN ${examSubmissions.isCorrect} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(examSubmissions)
    .innerJoin(examAssignments, eq(examSubmissions.assignmentId, examAssignments.id))
    .innerJoin(questions, eq(examSubmissions.questionId, questions.id))
    .where(eq(examAssignments.examId, examId))
    .groupBy(examSubmissions.questionId, questions.question, questions.type, questions.difficulty);

  // 計算錯誤率並排序
  const ranking = wrongAnswers
    .map((item) => ({
      questionId: item.questionId,
      question: item.question,
      type: item.type,
      difficulty: item.difficulty,
      totalAttempts: Number(item.totalAttempts),
      wrongCount: Number(item.wrongCount),
      wrongRate: Number(item.totalAttempts) > 0
        ? Math.round((Number(item.wrongCount) / Number(item.totalAttempts)) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 10); // 取前10題

  return ranking;
}

/**
 * 取得考生表現列表
 */
export async function getStudentPerformance(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    examAssignments,
    examScores,
    users,
  } = await import("../drizzle/schema");

  // 查詢所有考生的成績
  const performance = await db
    .select({
      assignmentId: examAssignments.id,
      userId: examAssignments.userId,
      userName: users.name,
      userEmail: users.email,
      status: examAssignments.status,
      startTime: examAssignments.startTime,
      endTime: examAssignments.endTime,
      totalScore: examScores.totalScore,
      maxScore: examScores.maxScore,
      percentage: examScores.percentage,
      passed: examScores.passed,
      gradedAt: examScores.gradedAt,
    })
    .from(examAssignments)
    .leftJoin(examScores, eq(examAssignments.id, examScores.assignmentId))
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .where(eq(examAssignments.examId, examId))
    .orderBy(sql`${examScores.percentage} DESC`);

  return performance;
}

/**
 * 取得所有考試的統計摘要（用於儀表板首頁）
 */
export async function getAllExamsStatistics() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    exams,
    examAssignments,
    examScores,
  } = await import("../drizzle/schema");

  // 取得所有考試
  const allExams = await db.select().from(exams);

  const statistics = [];

  for (const exam of allExams) {
    // 取得該考試的指派數量
    const assignments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(examAssignments)
      .where(eq(examAssignments.examId, exam.id));

    const totalAssignments = Number(assignments[0]?.count || 0);

    // 取得該考試的成績統計
    const scores = await db
      .select({
        count: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${examScores.percentage})`,
        passedCount: sql<number>`SUM(CASE WHEN ${examScores.passed} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(examScores)
      .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
      .where(eq(examAssignments.examId, exam.id));

    const totalGraded = Number(scores[0]?.count || 0);
    const avgScore = Number(scores[0]?.avgScore || 0);
    const passedCount = Number(scores[0]?.passedCount || 0);
    const passRate = totalGraded > 0 ? (passedCount / totalGraded) * 100 : 0;

    statistics.push({
      examId: exam.id,
      examTitle: exam.title,
      totalAssignments,
      totalGraded,
      averageScore: Math.round(avgScore * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      createdAt: exam.createdAt,
    });
  }

  return statistics.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

