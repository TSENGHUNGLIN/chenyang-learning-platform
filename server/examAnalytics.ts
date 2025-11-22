import { getDb } from "./db";
import { examScores, examSubmissions, examQuestions, questions as questionsTable, exams, examAssignments, users } from "../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * 獲取考試的詳細分析統計
 */
export async function getExamAnalytics(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. 獲取考試基本資訊
  const examData = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  if (examData.length === 0) {
    throw new Error("Exam not found");
  }

  const exam = examData[0];

  // 2. 獲取所有考生成績
  const scores = await db
    .select({
      scoreId: examScores.id,
      score: examScores.totalScore,
      totalScore: examScores.maxScore,
      percentage: examScores.percentage,
      isPassed: examScores.passed,
      gradedAt: examScores.gradedAt,
      assignmentId: examScores.assignmentId,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
    })
    .from(examScores)
    .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
    .innerJoin(users, eq(examAssignments.userId, users.id))
    .where(eq(examAssignments.examId, examId))
    .orderBy(desc(examScores.totalScore));

  // 3. 計算統計資料
  const totalStudents = scores.length;
  const averageScore = totalStudents > 0
    ? scores.reduce((sum, s) => sum + (s.score || 0), 0) / totalStudents
    : 0;
  const passedCount = scores.filter(s => s.isPassed).length;
  const passRate = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;

  // 4. 計算分數分布（10分一個區間）
  const scoreDistribution: { range: string; count: number; percentage: number }[] = [];
  const ranges = [
    { min: 0, max: 10, label: "0-10" },
    { min: 10, max: 20, label: "10-20" },
    { min: 20, max: 30, label: "20-30" },
    { min: 30, max: 40, label: "30-40" },
    { min: 40, max: 50, label: "40-50" },
    { min: 50, max: 60, label: "50-60" },
    { min: 60, max: 70, label: "60-70" },
    { min: 70, max: 80, label: "70-80" },
    { min: 80, max: 90, label: "80-90" },
    { min: 90, max: 100, label: "90-100" },
  ];

  for (const range of ranges) {
    const count = scores.filter(s => {
      const percentage = (s.score || 0) / (s.totalScore || 1) * 100;
      return percentage >= range.min && percentage < range.max;
    }).length;
    scoreDistribution.push({
      range: range.label,
      count,
      percentage: totalStudents > 0 ? (count / totalStudents) * 100 : 0,
    });
  }

  // 5. 獲取答題時間統計
  const submissions = await db
    .select({
      assignmentId: examSubmissions.assignmentId,
      questionId: examSubmissions.questionId,
      submittedAt: examSubmissions.submittedAt,
    })
    .from(examSubmissions)
    .innerJoin(examAssignments, eq(examSubmissions.assignmentId, examAssignments.id))
    .where(eq(examAssignments.examId, examId));

  // 計算每個考生的答題時間
  const answerTimes: Record<number, { startTime: Date | null; endTime: Date | null }> = {};
  for (const sub of submissions) {
    if (!answerTimes[sub.assignmentId]) {
      answerTimes[sub.assignmentId] = { startTime: null, endTime: null };
    }
    const submittedAt = sub.submittedAt ? new Date(sub.submittedAt) : null;
    if (submittedAt) {
      if (!answerTimes[sub.assignmentId].startTime || submittedAt < answerTimes[sub.assignmentId].startTime!) {
        answerTimes[sub.assignmentId].startTime = submittedAt;
      }
      if (!answerTimes[sub.assignmentId].endTime || submittedAt > answerTimes[sub.assignmentId].endTime!) {
        answerTimes[sub.assignmentId].endTime = submittedAt;
      }
    }
  }

  // 獲取考試開始時間
  const assignments = await db
    .select({
      id: examAssignments.id,
      startTime: examAssignments.startTime,
      submitTime: examAssignments.submitTime,
    })
    .from(examAssignments)
    .where(eq(examAssignments.examId, examId));

  const durations: number[] = [];
  for (const assignment of assignments) {
    if (assignment.startTime && assignment.submitTime) {
      const duration = (new Date(assignment.submitTime).getTime() - new Date(assignment.startTime).getTime()) / 1000 / 60; // 分鐘
      durations.push(duration);
    }
  }

  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;
  const fastestDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const slowestDuration = durations.length > 0 ? Math.max(...durations) : 0;

  // 6. 獲取錯題分析（錯誤率最高的TOP 10）
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
    .where(eq(examAssignments.examId, examId))
    .groupBy(examSubmissions.questionId, questionsTable.question, questionsTable.type)
    .orderBy(desc(sql`(SUM(CASE WHEN ${examSubmissions.isCorrect} = 0 THEN 1 ELSE 0 END) / COUNT(*) * 100)`))
    .limit(10);

  return {
    exam,
    statistics: {
      totalStudents: totalStudents || 0,
      averageScore: averageScore || 0,
      passedCount: passedCount || 0,
      passRate: passRate || 0,
    },
    scoreDistribution: scoreDistribution || [],
    answerTimeStats: {
      averageDuration: averageDuration || 0,
      fastestDuration: fastestDuration || 0,
      slowestDuration: slowestDuration || 0,
    },
    wrongAnswers: wrongAnswers || [],
    studentScores: scores || [],
  };
}

/**
 * 獲取考生排名列表
 */
export async function getStudentRankings(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rankings = await db
    .select({
      rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${examScores.totalScore} DESC)`,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      score: examScores.totalScore,
      totalScore: examScores.maxScore,
      percentage: examScores.percentage,
      isPassed: examScores.passed,
      gradedAt: examScores.gradedAt,
    })
    .from(examScores)
    .innerJoin(examAssignments, eq(examScores.assignmentId, examAssignments.id))
    .innerJoin(users, eq(examAssignments.userId, users.id))
    .where(eq(examAssignments.examId, examId))
    .orderBy(desc(examScores.totalScore));

  return rankings;
}

