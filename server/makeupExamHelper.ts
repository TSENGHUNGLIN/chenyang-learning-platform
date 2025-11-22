import { eq, and, desc, isNull } from "drizzle-orm";
import { getDb } from "./db";
import {
  makeupExams,
  examAssignments,
  examScores,
  exams,
  users,
  notifications,
  learningRecommendations,
  wrongQuestions,
  examSubmissions,
  questions,
  questionCategories,
  questionTags,
  tags,
  InsertMakeupExam,
  InsertNotification,
  InsertLearningRecommendation,
} from "../drizzle/schema";

/**
 * 自動檢測不及格考試並建立補考記錄
 * 在考試評分完成後自動呼叫
 */
export async function autoCreateMakeupExamForFailedStudent(
  assignmentId: number,
  userId: number,
  examId: number,
  score: number,
  passingScore: number
): Promise<{ success: boolean; makeupExamId?: number; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "資料庫連線失敗" };
  }

  try {
    // 檢查是否及格
    if (score >= passingScore) {
      return { success: false, message: "考試已及格，無需補考" };
    }

    // 檢查是否已經有補考記錄
    const existingMakeup = await db
      .select()
      .from(makeupExams)
      .where(eq(makeupExams.originalAssignmentId, assignmentId))
      .limit(1);

    if (existingMakeup.length > 0) {
      return { success: false, message: "已存在補考記錄" };
    }

    // 建立補考記錄
    const makeupExamData: InsertMakeupExam = {
      originalAssignmentId: assignmentId,
      userId,
      examId,
      makeupCount: 1,
      maxMakeupAttempts: 2, // 預設最多可補考2次
      originalScore: score,
      status: "pending",
      reason: `原始考試分數 ${score} 分，未達及格標準 ${passingScore} 分`,
    };

    const result = await db.insert(makeupExams).values(makeupExamData);
    const makeupExamId = Number(result[0].insertId);

    // 發送不及格通知給考生
    const notificationData: InsertNotification = {
      userId,
      notificationType: "exam_failed",
      title: "考試未通過通知",
      content: `您的考試成績為 ${score} 分，未達及格標準 ${passingScore} 分。系統已為您安排補考機會，請聯繫管理員了解補考時間。`,
      relatedExamId: examId,
      relatedAssignmentId: assignmentId,
      relatedMakeupExamId: makeupExamId,
    };

    await db.insert(notifications).values(notificationData);

    // 生成學習建議
    await generateLearningRecommendations(assignmentId, userId, makeupExamId);

    // 通知管理員有新的待補考考生
    const { notifyAdminAboutFailedExam } = await import("./notificationHelper");
    await notifyAdminAboutFailedExam(examId, userId, makeupExamId);

    return {
      success: true,
      makeupExamId,
      message: "已自動建立補考記錄並發送通知",
    };
  } catch (error) {
    console.error("[makeupExamHelper] 自動建立補考記錄失敗:", error);
    return { success: false, message: "建立補考記錄失敗" };
  }
}

/**
 * 管理員安排補考
 */
export async function scheduleMakeupExam(
  makeupExamId: number,
  deadline: Date,
  notes: string | null,
  scheduledBy: number
): Promise<{ success: boolean; assignmentId?: number; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "資料庫連線失敗" };
  }

  try {
    // 獲取補考記錄
    const makeupRecord = await db
      .select()
      .from(makeupExams)
      .where(eq(makeupExams.id, makeupExamId))
      .limit(1);

    if (makeupRecord.length === 0) {
      return { success: false, message: "補考記錄不存在" };
    }

    const makeup = makeupRecord[0];

    // 檢查補考次數是否超過限制
    if (makeup.makeupCount > makeup.maxMakeupAttempts) {
      return { success: false, message: "已超過最大補考次數限制" };
    }

    // 建立新的考試指派
    const assignmentData = {
      examId: makeup.examId,
      userId: makeup.userId,
      deadline,
      status: "pending" as const,
      isPractice: 0,
    };

    const assignmentResult = await db.insert(examAssignments).values(assignmentData);
    const newAssignmentId = Number(assignmentResult[0].insertId);

    // 更新補考記錄
    await db
      .update(makeupExams)
      .set({
        makeupAssignmentId: newAssignmentId,
        makeupDeadline: deadline,
        status: "scheduled",
        scheduledBy,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(makeupExams.id, makeupExamId));

    // 發送補考安排通知給考生
    const notificationData: InsertNotification = {
      userId: makeup.userId,
      notificationType: "makeup_scheduled",
      title: "補考已安排",
      content: `您的補考已安排，截止日期為 ${deadline.toLocaleString("zh-TW")}。請在截止日期前完成考試。${notes ? `\n備註：${notes}` : ""}`,
      relatedExamId: makeup.examId,
      relatedAssignmentId: newAssignmentId,
      relatedMakeupExamId: makeupExamId,
    };

    await db.insert(notifications).values(notificationData);

    return {
      success: true,
      assignmentId: newAssignmentId,
      message: "補考已成功安排",
    };
  } catch (error) {
    console.error("[makeupExamHelper] 安排補考失敗:", error);
    return { success: false, message: "安排補考失敗" };
  }
}

/**
 * 獲取需要補考的考生列表
 */
export async function getPendingMakeupExams(editorId?: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const results = await db
      .select({
        makeupExam: makeupExams,
        user: users,
        exam: exams,
        originalAssignment: examAssignments,
      })
      .from(makeupExams)
      .leftJoin(users, eq(makeupExams.userId, users.id))
      .leftJoin(exams, eq(makeupExams.examId, exams.id))
      .leftJoin(examAssignments, eq(makeupExams.originalAssignmentId, examAssignments.id))
      .where(eq(makeupExams.status, "pending"))
      .orderBy(desc(makeupExams.createdAt));

    return results;
  } catch (error) {
    console.error("[makeupExamHelper] 獲取待補考列表失敗:", error);
    return [];
  }
}

/**
 * 獲取補考歷史記錄
 */
export async function getMakeupExamHistory(userId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const results = await db
      .select({
        makeupExam: makeupExams,
        exam: exams,
        originalAssignment: examAssignments,
        makeupAssignment: examAssignments,
      })
      .from(makeupExams)
      .leftJoin(exams, eq(makeupExams.examId, exams.id))
      .leftJoin(examAssignments, eq(makeupExams.originalAssignmentId, examAssignments.id))
      .where(eq(makeupExams.userId, userId))
      .orderBy(desc(makeupExams.createdAt));

    return results;
  } catch (error) {
    console.error("[makeupExamHelper] 獲取補考歷史失敗:", error);
    return [];
  }
}

/**
 * 更新補考成績
 * 在補考完成評分後自動呼叫
 */
export async function updateMakeupExamScore(
  makeupExamId: number,
  makeupScore: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "資料庫連線失敗" };
  }

  try {
    await db
      .update(makeupExams)
      .set({
        makeupScore,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(makeupExams.id, makeupExamId));

    return { success: true, message: "補考成績已更新" };
  } catch (error) {
    console.error("[makeupExamHelper] 更新補考成績失敗:", error);
    return { success: false, message: "更新補考成績失敗" };
  }
}

/**
 * 生成學習建議（根據錯題分析）
 */
async function generateLearningRecommendations(
  assignmentId: number,
  userId: number,
  makeupExamId: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    // 獲取該考試的所有錯題
    const wrongAnswers = await db
      .select({
        submission: examSubmissions,
        question: questions,
        category: questionCategories,
      })
      .from(examSubmissions)
      .leftJoin(questions, eq(examSubmissions.questionId, questions.id))
      .leftJoin(questionCategories, eq(questions.categoryId, questionCategories.id))
      .where(
        and(
          eq(examSubmissions.assignmentId, assignmentId),
          eq(examSubmissions.isCorrect, 0)
        )
      );

    if (wrongAnswers.length === 0) {
      return; // 沒有錯題，不需要生成建議
    }

    // 分析錯題的分類分布
    const categoryCount: Record<number, { name: string; count: number; questionIds: number[] }> = {};
    const allWrongQuestionIds: number[] = [];

    for (const item of wrongAnswers) {
      if (item.question && item.category) {
        const categoryId = item.category.id;
        allWrongQuestionIds.push(item.question.id);

        if (!categoryCount[categoryId]) {
          categoryCount[categoryId] = {
            name: item.category.name,
            count: 0,
            questionIds: [],
          };
        }
        categoryCount[categoryId].count++;
        categoryCount[categoryId].questionIds.push(item.question.id);
      }
    }

    // 找出錯誤率最高的分類（需加強知識點）
    const sortedCategories = Object.entries(categoryCount).sort(
      ([, a], [, b]) => b.count - a.count
    );

    const weakTopics = sortedCategories.slice(0, 3); // 取前3個需加強的分類

    // 建立「需加強知識點」建議
    if (weakTopics.length > 0) {
      const weakTopicsContent = {
        summary: `根據您的答題情況，以下知識點需要加強：`,
        topics: weakTopics.map(([categoryId, data]) => ({
          categoryId: Number(categoryId),
          categoryName: data.name,
          wrongCount: data.count,
          questionIds: data.questionIds,
        })),
      };

      const weakTopicsRecommendation: InsertLearningRecommendation = {
        userId,
        assignmentId,
        makeupExamId,
        recommendationType: "weak_topics",
        title: "需加強知識點",
        content: JSON.stringify(weakTopicsContent),
        relatedQuestionIds: JSON.stringify(allWrongQuestionIds),
        relatedCategoryIds: JSON.stringify(weakTopics.map(([id]) => Number(id))),
        priority: "high",
        generatedBy: "system",
      };

      await db.insert(learningRecommendations).values(weakTopicsRecommendation);
    }

    // 建立「相關題目練習」建議
    const practiceRecommendation: InsertLearningRecommendation = {
      userId,
      assignmentId,
      makeupExamId,
      recommendationType: "practice_questions",
      title: "建議練習題目",
      content: JSON.stringify({
        summary: `建議您重新練習以下 ${allWrongQuestionIds.length} 道錯題，加深理解。`,
        questionIds: allWrongQuestionIds,
      }),
      relatedQuestionIds: JSON.stringify(allWrongQuestionIds),
      priority: "medium",
      generatedBy: "system",
    };

    await db.insert(learningRecommendations).values(practiceRecommendation);
  } catch (error) {
    console.error("[makeupExamHelper] 生成學習建議失敗:", error);
  }
}

/**
 * 獲取考生的學習建議
 */
export async function getLearningRecommendations(userId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const results = await db
      .select()
      .from(learningRecommendations)
      .where(eq(learningRecommendations.userId, userId))
      .orderBy(desc(learningRecommendations.priority), desc(learningRecommendations.createdAt));

    return results;
  } catch (error) {
    console.error("[makeupExamHelper] 獲取學習建議失敗:", error);
    return [];
  }
}

/**
 * 標記學習建議為已讀
 */
export async function markRecommendationAsRead(recommendationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(learningRecommendations)
      .set({
        isRead: 1,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(learningRecommendations.id, recommendationId));

    return true;
  } catch (error) {
    console.error("[makeupExamHelper] 標記學習建議為已讀失敗:", error);
    return false;
  }
}

