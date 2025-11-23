import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { exams, examAssignments, examSubmissions, makeupExams } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * 考試刪除影響分析結果
 */
export interface ExamDeletionImpact {
  examId: number;
  examTitle: string;
  assignedCount: number; // 已指派考生數量
  submittedCount: number; // 已提交考試數量
  makeupCount: number; // 相關補考記錄數量
  canDelete: boolean; // 是否可以刪除
  warnings: string[]; // 警告訊息
}

/**
 * 獲取單個考試的刪除影響分析
 */
export async function getExamDeletionImpact(examId: number): Promise<ExamDeletionImpact> {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  // 獲取考試資訊
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam) {
    throw new Error("考試不存在");
  }

  // 統計已指派考生數量
  const assignments = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.examId, examId));
  const assignedCount = assignments.length;

  // 統計已提交考試數量
  const submissions = await db
    .select()
    .from(examSubmissions)
    .where(eq(examSubmissions.examId, examId));
  const submittedCount = submissions.length;

  // 統計相關補考記錄數量
  const makeups = await db
    .select()
    .from(makeupExams)
    .where(eq(makeupExams.originalExamId, examId));
  const makeupCount = makeups.length;

  // 生成警告訊息
  const warnings: string[] = [];
  if (assignedCount > 0) {
    warnings.push(`此考試已指派給 ${assignedCount} 位考生`);
  }
  if (submittedCount > 0) {
    warnings.push(`已有 ${submittedCount} 份考試提交記錄`);
  }
  if (makeupCount > 0) {
    warnings.push(`存在 ${makeupCount} 筆相關補考記錄`);
  }

  // 判斷是否可以刪除（草稿狀態且無任何相關記錄可以直接刪除）
  const canDelete = exam.status === "draft" && assignedCount === 0 && submittedCount === 0 && makeupCount === 0;

  return {
    examId,
    examTitle: exam.title,
    assignedCount,
    submittedCount,
    makeupCount,
    canDelete,
    warnings,
  };
}

/**
 * 批次獲取多個考試的刪除影響分析
 */
export async function getBatchExamDeletionImpact(examIds: number[]): Promise<ExamDeletionImpact[]> {
  const results: ExamDeletionImpact[] = [];
  for (const examId of examIds) {
    try {
      const impact = await getExamDeletionImpact(examId);
      results.push(impact);
    } catch (error) {
      console.error(`獲取考試 ${examId} 的刪除影響分析失敗:`, error);
    }
  }
  return results;
}

/**
 * 軟刪除單個考試
 */
export async function softDeleteExam(examId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  await db
    .update(exams)
    .set({ deletedAt: new Date() })
    .where(eq(exams.id, examId));
}

/**
 * 批次軟刪除多個考試
 */
export async function batchSoftDeleteExams(examIds: number[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const examId of examIds) {
    try {
      await softDeleteExam(examId);
      success++;
    } catch (error) {
      console.error(`軟刪除考試 ${examId} 失敗:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 恢復已刪除的考試
 */
export async function restoreExam(examId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  await db
    .update(exams)
    .set({ deletedAt: null })
    .where(eq(exams.id, examId));
}

/**
 * 批次恢復多個考試
 */
export async function batchRestoreExams(examIds: number[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const examId of examIds) {
    try {
      await restoreExam(examId);
      success++;
    } catch (error) {
      console.error(`恢復考試 ${examId} 失敗:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 永久刪除考試（真實刪除）
 */
export async function permanentlyDeleteExam(examId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  // 先刪除相關的考試指派記錄
  await db.delete(examAssignments).where(eq(examAssignments.examId, examId));

  // 刪除考試提交記錄
  await db.delete(examSubmissions).where(eq(examSubmissions.examId, examId));

  // 刪除補考記錄
  await db.delete(makeupExams).where(eq(makeupExams.originalExamId, examId));

  // 最後刪除考試本身
  await db.delete(exams).where(eq(exams.id, examId));
}

/**
 * 批次永久刪除多個考試
 */
export async function batchPermanentlyDeleteExams(examIds: number[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const examId of examIds) {
    try {
      await permanentlyDeleteExam(examId);
      success++;
    } catch (error) {
      console.error(`永久刪除考試 ${examId} 失敗:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 獲取已刪除的考試列表（回收站）
 */
export async function getDeletedExams() {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  const deletedExams = await db
    .select()
    .from(exams)
    .where(isNotNull(exams.deletedAt))
    .orderBy(exams.deletedAt);

  return deletedExams;
}

/**
 * 獲取未刪除的考試列表（過濾已刪除的考試）
 */
export async function getActiveExams() {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  const activeExams = await db
    .select()
    .from(exams)
    .where(isNull(exams.deletedAt))
    .orderBy(exams.createdAt);

  return activeExams;
}

