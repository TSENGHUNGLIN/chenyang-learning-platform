import { db } from "@db";
import { exams, examAssignments, examSubmissions, questions, examQuestions } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * 取得考試圖表資料
 */
export async function getExamChartData(examId: number) {
  // 取得考試基本資訊
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
  });

  if (!exam) {
    throw new Error("找不到考試");
  }

  // 1. 成績趨勢資料（模擬資料，實際應該從歷史考試中取得）
  // 這裡我們取得同一考生在不同考試中的成績
  const scoreTrend = await getScoreTrendData(examId);

  // 2. 能力維度分析（根據題目分類統計）
  const abilityAnalysis = await getAbilityAnalysisData(examId);

  return {
    scoreTrend,
    abilityAnalysis,
  };
}

/**
 * 取得成績趨勢資料
 */
async function getScoreTrendData(examId: number) {
  // 取得該考試的所有提交記錄
  const submissions = await db
    .select({
      examId: examSubmissions.examId,
      examTitle: exams.title,
      score: examSubmissions.score,
      submittedAt: examSubmissions.submittedAt,
    })
    .from(examSubmissions)
    .innerJoin(examAssignments, eq(examSubmissions.assignmentId, examAssignments.id))
    .innerJoin(exams, eq(examAssignments.examId, exams.id))
    .where(eq(examAssignments.examId, examId))
    .orderBy(desc(examSubmissions.submittedAt))
    .limit(10);

  // 轉換為圖表格式
  return submissions.map((s) => ({
    examTitle: s.examTitle,
    score: s.score || 0,
    date: s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("zh-TW") : "",
  }));
}

/**
 * 取得能力維度分析資料
 */
async function getAbilityAnalysisData(examId: number) {
  // 取得該考試的所有題目及其分類
  const examQuestionsData = await db
    .select({
      questionId: examQuestions.questionId,
      category: questions.category,
      points: examQuestions.points,
    })
    .from(examQuestions)
    .innerJoin(questions, eq(examQuestions.questionId, questions.id))
    .where(eq(examQuestions.examId, examId));

  if (examQuestionsData.length === 0) {
    return [];
  }

  // 取得所有提交的答案統計
  const submissions = await db
    .select({
      answers: examSubmissions.answers,
      score: examSubmissions.score,
    })
    .from(examSubmissions)
    .innerJoin(examAssignments, eq(examSubmissions.assignmentId, examAssignments.id))
    .where(
      and(
        eq(examAssignments.examId, examId),
        sql`${examSubmissions.answers} IS NOT NULL`
      )
    );

  // 按分類統計得分率
  const categoryStats = new Map<string, { totalScore: number; maxScore: number }>();

  for (const question of examQuestionsData) {
    const category = question.category || "未分類";
    const points = question.points || 0;

    if (!categoryStats.has(category)) {
      categoryStats.set(category, { totalScore: 0, maxScore: 0 });
    }

    const stats = categoryStats.get(category)!;
    stats.maxScore += points;

    // 計算該題目的平均得分
    let totalQuestionScore = 0;
    let submissionCount = 0;

    for (const submission of submissions) {
      if (!submission.answers) continue;

      try {
        const answers = JSON.parse(submission.answers as string);
        const answer = answers[question.questionId];

        if (answer && answer.earnedPoints !== undefined) {
          totalQuestionScore += answer.earnedPoints;
          submissionCount++;
        }
      } catch (e) {
        // 忽略解析錯誤
      }
    }

    if (submissionCount > 0) {
      stats.totalScore += totalQuestionScore / submissionCount;
    }
  }

  // 轉換為圖表格式
  const result = Array.from(categoryStats.entries()).map(([category, stats]) => {
    const score = stats.maxScore > 0 ? (stats.totalScore / stats.maxScore) * 100 : 0;
    return {
      category,
      score: Math.round(score * 10) / 10, // 保留一位小數
      fullMark: 100,
    };
  });

  return result;
}
