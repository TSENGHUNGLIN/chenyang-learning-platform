import { getDb } from "./db";
import { wrongQuestions, questions, examSubmissions, examAssignments } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * 收集錯題（考試提交後自動調用）
 */
export async function collectWrongQuestions(assignmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 獲取該考試的所有答錯題目
    const wrongSubmissions = await db
      .select({
        questionId: examSubmissions.questionId,
      })
      .from(examSubmissions)
      .where(
        and(
          eq(examSubmissions.assignmentId, assignmentId),
          eq(examSubmissions.isCorrect, 0) // 答錯的題目
        )
      );

    if (wrongSubmissions.length === 0) {
      return { success: true, count: 0 };
    }

    // 對每個錯題進行處理
    for (const submission of wrongSubmissions) {
      const questionId = submission.questionId;

      // 檢查該題目是否已經在錯題本中
      const existing = await db
        .select()
        .from(wrongQuestions)
        .where(
          and(
            eq(wrongQuestions.userId, userId),
            eq(wrongQuestions.questionId, questionId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 已存在，更新錯誤次數和最後錯誤時間
        await db
          .update(wrongQuestions)
          .set({
            wrongCount: sql`${wrongQuestions.wrongCount} + 1`,
            lastWrongAt: new Date(),
            isReviewed: 0, // 重置複習狀態
            updatedAt: new Date(),
          })
          .where(eq(wrongQuestions.id, existing[0].id));
      } else {
        // 不存在，新增錯題記錄
        await db.insert(wrongQuestions).values({
          userId,
          questionId,
          wrongCount: 1,
          lastWrongAt: new Date(),
          isReviewed: 0,
        });
      }
    }

    return { success: true, count: wrongSubmissions.length };
  } catch (error) {
    console.error("Failed to collect wrong questions:", error);
    throw error;
  }
}

/**
 * 獲取使用者的錯題列表
 */
export async function getUserWrongQuestions(userId: number, options?: {
  questionType?: string;
  isReviewed?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let query = db
      .select({
        id: wrongQuestions.id,
        questionId: wrongQuestions.questionId,
        wrongCount: wrongQuestions.wrongCount,
        lastWrongAt: wrongQuestions.lastWrongAt,
        isReviewed: wrongQuestions.isReviewed,
        reviewedAt: wrongQuestions.reviewedAt,
        // 題目詳情
        questionType: questions.type,
        questionContent: questions.content,
        questionOptions: questions.options,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        difficulty: questions.difficulty,
        category: questions.category,
      })
      .from(wrongQuestions)
      .innerJoin(questions, eq(wrongQuestions.questionId, questions.id))
      .where(eq(wrongQuestions.userId, userId))
      .$dynamic();

    // 篩選條件
    if (options?.questionType) {
      query = query.where(eq(questions.type, options.questionType));
    }

    if (options?.isReviewed !== undefined) {
      query = query.where(eq(wrongQuestions.isReviewed, options.isReviewed ? 1 : 0));
    }

    // 排序：按錯誤次數降序，然後按最後錯誤時間降序
    query = query.orderBy(desc(wrongQuestions.wrongCount), desc(wrongQuestions.lastWrongAt));

    // 分頁
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const result = await query;
    return result;
  } catch (error) {
    console.error("Failed to get user wrong questions:", error);
    throw error;
  }
}

/**
 * 標記錯題為已複習
 */
export async function markAsReviewed(wrongQuestionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 驗證該錯題屬於該使用者
    const wrongQuestion = await db
      .select()
      .from(wrongQuestions)
      .where(
        and(
          eq(wrongQuestions.id, wrongQuestionId),
          eq(wrongQuestions.userId, userId)
        )
      )
      .limit(1);

    if (wrongQuestion.length === 0) {
      throw new Error("Wrong question not found or access denied");
    }

    // 更新為已複習
    await db
      .update(wrongQuestions)
      .set({
        isReviewed: 1,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(wrongQuestions.id, wrongQuestionId));

    return { success: true };
  } catch (error) {
    console.error("Failed to mark as reviewed:", error);
    throw error;
  }
}

/**
 * 批次標記錯題為已複習
 */
export async function batchMarkAsReviewed(wrongQuestionIds: number[], userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 更新為已複習（只更新屬於該使用者的錯題）
    await db
      .update(wrongQuestions)
      .set({
        isReviewed: 1,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${wrongQuestions.id} IN (${sql.raw(wrongQuestionIds.join(","))})`,
          eq(wrongQuestions.userId, userId)
        )
      );

    return { success: true, count: wrongQuestionIds.length };
  } catch (error) {
    console.error("Failed to batch mark as reviewed:", error);
    throw error;
  }
}

/**
 * 獲取錯題統計資訊
 */
export async function getWrongQuestionStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 總錯題數
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(wrongQuestions)
      .where(eq(wrongQuestions.userId, userId));

    const total = totalResult[0]?.count || 0;

    // 未複習錯題數
    const unreviewedResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(wrongQuestions)
      .where(
        and(
          eq(wrongQuestions.userId, userId),
          eq(wrongQuestions.isReviewed, 0)
        )
      );

    const unreviewed = unreviewedResult[0]?.count || 0;

    // 按題型統計
    const byTypeResult = await db
      .select({
        type: questions.type,
        count: sql<number>`COUNT(*)`,
      })
      .from(wrongQuestions)
      .innerJoin(questions, eq(wrongQuestions.questionId, questions.id))
      .where(eq(wrongQuestions.userId, userId))
      .groupBy(questions.type);

    return {
      total,
      unreviewed,
      reviewed: total - unreviewed,
      byType: byTypeResult,
    };
  } catch (error) {
    console.error("Failed to get wrong question stats:", error);
    throw error;
  }
}

/**
 * 刪除錯題記錄（當考生答對該題目時）
 */
export async function removeWrongQuestion(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .delete(wrongQuestions)
      .where(
        and(
          eq(wrongQuestions.userId, userId),
          eq(wrongQuestions.questionId, questionId)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Failed to remove wrong question:", error);
    throw error;
  }
}

