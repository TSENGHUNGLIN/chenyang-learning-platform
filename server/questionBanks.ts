import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { questionBanks, questionBankItems, questions, InsertQuestionBank, InsertQuestionBankItem } from "../drizzle/schema";

/**
 * 建立題庫檔案
 */
export async function createQuestionBank(data: InsertQuestionBank) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(questionBanks).values(data);
  const bankId = Number(result.insertId);
  
  if (isNaN(bankId) || bankId <= 0) {
    throw new Error(`Failed to create question bank: invalid insertId ${result.insertId}`);
  }
  
  return { id: bankId, name: data.name, description: data.description, createdBy: data.createdBy };
}

/**
 * 取得所有題庫檔案列表
 */
export async function getAllQuestionBanks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(questionBanks).orderBy(desc(questionBanks.createdAt));
}

/**
 * 根據ID取得題庫檔案詳情
 */
export async function getQuestionBankById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(questionBanks).where(eq(questionBanks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * 取得題庫檔案中的所有題目
 */
export async function getQuestionBankQuestions(bankId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: questions.id,
      type: questions.type,
      difficulty: questions.difficulty,
      question: questions.question,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      source: questions.source,
      order: questionBankItems.order,
    })
    .from(questionBankItems)
    .innerJoin(questions, eq(questionBankItems.questionId, questions.id))
    .where(eq(questionBankItems.bankId, bankId))
    .orderBy(questionBankItems.order);

  return result;
}

/**
 * 新增題目到題庫檔案
 */
export async function addQuestionToBank(bankId: number, questionId: number, order?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 如果沒有指定順序，自動取得最大順序+1
  if (order === undefined) {
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`MAX(${questionBankItems.order})` })
      .from(questionBankItems)
      .where(eq(questionBankItems.bankId, bankId));
    
    order = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
  }

  await db.insert(questionBankItems).values({
    bankId,
    questionId,
    order,
  });

  // 更新題庫檔案的題目數量
  await db
    .update(questionBanks)
    .set({ 
      questionCount: sql`${questionBanks.questionCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(questionBanks.id, bankId));

  return { success: true };
}

/**
 * 批次新增題目到題庫檔案
 */
export async function batchAddQuestionsToBank(bankId: number, questionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 取得當前最大順序
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`MAX(${questionBankItems.order})` })
    .from(questionBankItems)
    .where(eq(questionBankItems.bankId, bankId));
  
  let currentOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

  // 批次插入
  const items: InsertQuestionBankItem[] = questionIds.map((questionId) => ({
    bankId,
    questionId,
    order: currentOrder++,
  }));

  await db.insert(questionBankItems).values(items);

  // 更新題庫檔案的題目數量
  await db
    .update(questionBanks)
    .set({ 
      questionCount: sql`${questionBanks.questionCount} + ${questionIds.length}`,
      updatedAt: new Date(),
    })
    .where(eq(questionBanks.id, bankId));

  return { success: true, count: questionIds.length };
}

/**
 * 從題庫檔案移除題目
 */
export async function removeQuestionFromBank(bankId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(questionBankItems)
    .where(
      sql`${questionBankItems.bankId} = ${bankId} AND ${questionBankItems.questionId} = ${questionId}`
    );

  // 更新題庫檔案的題目數量
  await db
    .update(questionBanks)
    .set({ 
      questionCount: sql`${questionBanks.questionCount} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(questionBanks.id, bankId));

  return { success: true };
}

/**
 * 更新題庫檔案資訊
 */
export async function updateQuestionBank(id: number, data: Partial<InsertQuestionBank>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(questionBanks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(questionBanks.id, id));

  return { success: true };
}

/**
 * 刪除題庫檔案
 */
export async function deleteQuestionBank(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 先刪除關聯的題目
  await db.delete(questionBankItems).where(eq(questionBankItems.bankId, id));

  // 刪除題庫檔案
  await db.delete(questionBanks).where(eq(questionBanks.id, id));

  return { success: true };
}

