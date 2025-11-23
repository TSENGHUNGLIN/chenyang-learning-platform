/**
 * 考試規劃模組
 * 提供批次考試規劃、CSV匯入、逾期處理等功能
 */

import { getDb } from "./db";
import { examAssignments, examPlanningBatches, exams, users, overdueExamActions } from "../drizzle/schema";
import { eq, inArray, and, lt, isNull, or } from "drizzle-orm";

/**
 * 批次規劃考試
 * 為多位考生指派多份考卷，並設定各自的開始時間和截止時間
 */
export async function batchPlanExams(data: {
  planningItems: Array<{
    examId: number;
    userId: number;
    startTime?: Date;
    deadline?: Date;
  }>;
  batchName?: string;
  description?: string;
  importSource?: "manual" | "csv" | "excel";
  importFileName?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 驗證考試和使用者是否存在
  const examIds = [...new Set(data.planningItems.map(item => item.examId))];
  const userIds = [...new Set(data.planningItems.map(item => item.userId))];

  const existingExams = await db.select({ id: exams.id }).from(exams).where(inArray(exams.id, examIds));
  const existingUsers = await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds));

  const existingExamIds = new Set(existingExams.map(e => e.id));
  const existingUserIds = new Set(existingUsers.map(u => u.id));

  // 過濾掉不存在的考試或使用者
  const validItems = data.planningItems.filter(
    item => existingExamIds.has(item.examId) && existingUserIds.has(item.userId)
  );

  if (validItems.length === 0) {
    throw new Error("沒有有效的考試規劃項目");
  }

  // 準備批次插入的資料
  const assignments = validItems.map(item => ({
    examId: item.examId,
    userId: item.userId,
    employeeId: null,
    startTime: item.startTime || null,
    deadline: item.deadline || null,
    status: 'pending' as const,
    isPractice: 0,
  }));

  // 批次插入（分批處理，每批100筆）
  const batchSize = 100;
  for (let i = 0; i < assignments.length; i += batchSize) {
    const batch = assignments.slice(i, i + batchSize);
    await db.insert(examAssignments).values(batch);
  }

  // 記錄批次規劃
  await db.insert(examPlanningBatches).values({
    batchName: data.batchName || null,
    description: data.description || null,
    totalAssignments: validItems.length,
    examIds: JSON.stringify(examIds),
    userIds: JSON.stringify(userIds),
    importSource: data.importSource || "manual",
    importFileName: data.importFileName || null,
    createdBy: data.createdBy,
  });

  return {
    success: true,
    totalPlanned: validItems.length,
    invalidItems: data.planningItems.length - validItems.length,
  };
}

/**
 * 解析 CSV 批次匯入資料
 * CSV 格式：考生姓名,考生Email,考卷名稱,開始時間,截止時間
 */
export async function parseExamPlanningCSV(csvContent: string) {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error("CSV 檔案格式錯誤：至少需要標題行和一行資料");
  }

  // 跳過標題行
  const dataLines = lines.slice(1);
  
  const parsedItems: Array<{
    userName: string;
    userEmail: string;
    examTitle: string;
    startTime?: string;
    deadline?: string;
  }> = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // 簡單的 CSV 解析（支援逗號分隔）
    const parts = line.split(',').map(p => p.trim());
    
    if (parts.length < 3) {
      continue; // 跳過格式錯誤的行
    }

    parsedItems.push({
      userName: parts[0] || "",
      userEmail: parts[1] || "",
      examTitle: parts[2] || "",
      startTime: parts[3] || undefined,
      deadline: parts[4] || undefined,
    });
  }

  return parsedItems;
}

/**
 * 將解析的 CSV 資料轉換為考試規劃項目
 * 自動查找對應的考試和使用者ID
 */
export async function convertCSVToPlanningItems(parsedItems: Array<{
  userName: string;
  userEmail: string;
  examTitle: string;
  startTime?: string;
  deadline?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查找所有相關的考試和使用者
  const examTitles = [...new Set(parsedItems.map(item => item.examTitle))];
  const userEmails = [...new Set(parsedItems.map(item => item.userEmail).filter(e => e))];
  const userNames = [...new Set(parsedItems.map(item => item.userName).filter(n => n))];

  const examList = await db
    .select({ id: exams.id, title: exams.title })
    .from(exams)
    .where(inArray(exams.title, examTitles));

  const userList = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      or(
        inArray(users.email, userEmails.length > 0 ? userEmails : [""]),
        inArray(users.name, userNames.length > 0 ? userNames : [""])
      )
    );

  // 建立查找映射
  const examMap = new Map(examList.map(e => [e.title, e.id]));
  const userByEmailMap = new Map(userList.filter(u => u.email).map(u => [u.email!, u.id]));
  const userByNameMap = new Map(userList.filter(u => u.name).map(u => [u.name!, u.id]));

  // 轉換為規劃項目
  const planningItems: Array<{
    examId: number;
    userId: number;
    startTime?: Date;
    deadline?: Date;
  }> = [];

  const errors: string[] = [];

  for (const item of parsedItems) {
    const examId = examMap.get(item.examTitle);
    const userId = userByEmailMap.get(item.userEmail) || userByNameMap.get(item.userName);

    if (!examId) {
      errors.push(`找不到考卷：${item.examTitle}`);
      continue;
    }

    if (!userId) {
      errors.push(`找不到考生：${item.userName} (${item.userEmail})`);
      continue;
    }

    planningItems.push({
      examId,
      userId,
      startTime: item.startTime ? new Date(item.startTime) : undefined,
      deadline: item.deadline ? new Date(item.deadline) : undefined,
    });
  }

  return { planningItems, errors };
}

/**
 * 查詢所有考試規劃批次記錄
 */
export async function getExamPlanningBatches(options?: {
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const batches = await db
    .select()
    .from(examPlanningBatches)
    .orderBy(examPlanningBatches.createdAt)
    .limit(limit)
    .offset(offset);

  return batches;
}

/**
 * 查詢逾期考試
 * 返回所有已超過截止時間但尚未提交的考試
 */
export async function getOverdueExams() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  const overdueAssignments = await db
    .select({
      assignment: examAssignments,
      exam: exams,
      user: users,
    })
    .from(examAssignments)
    .leftJoin(exams, eq(examAssignments.examId, exams.id))
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .where(
      and(
        lt(examAssignments.deadline, now),
        or(
          eq(examAssignments.status, "pending"),
          eq(examAssignments.status, "in_progress")
        )
      )
    );

  return overdueAssignments;
}

/**
 * 標記逾期考試
 * 建立逾期處理記錄
 */
export async function markExamAsOverdue(assignmentId: number, performedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查詢考試指派資訊
  const assignment = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.id, assignmentId))
    .limit(1);

  if (assignment.length === 0) {
    throw new Error("找不到考試指派記錄");
  }

  const assignmentData = assignment[0];

  if (!assignmentData.deadline) {
    throw new Error("該考試沒有設定截止時間");
  }

  const now = new Date();
  const overdueBy = Math.floor((now.getTime() - assignmentData.deadline.getTime()) / (1000 * 60 * 60 * 24));

  // 建立逾期處理記錄
  await db.insert(overdueExamActions).values({
    assignmentId: assignmentData.id,
    examId: assignmentData.examId,
    userId: assignmentData.userId,
    actionType: "marked_overdue",
    actionDetails: JSON.stringify({ markedAt: now.toISOString() }),
    overdueBy,
    originalDeadline: assignmentData.deadline,
    newDeadline: null,
    performedBy: performedBy || null,
  });

  return { success: true, overdueBy };
}

/**
 * 延長考試截止時間
 */
export async function extendExamDeadline(
  assignmentId: number,
  newDeadline: Date,
  performedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查詢考試指派資訊
  const assignment = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.id, assignmentId))
    .limit(1);

  if (assignment.length === 0) {
    throw new Error("找不到考試指派記錄");
  }

  const assignmentData = assignment[0];
  const originalDeadline = assignmentData.deadline;

  // 更新截止時間
  await db
    .update(examAssignments)
    .set({ deadline: newDeadline })
    .where(eq(examAssignments.id, assignmentId));

  // 建立逾期處理記錄
  await db.insert(overdueExamActions).values({
    assignmentId: assignmentData.id,
    examId: assignmentData.examId,
    userId: assignmentData.userId,
    actionType: "deadline_extended",
    actionDetails: JSON.stringify({
      extendedAt: new Date().toISOString(),
      reason: "管理員延長截止時間",
    }),
    overdueBy: null,
    originalDeadline,
    newDeadline,
    performedBy,
  });

  return { success: true };
}

/**
 * 查詢逾期處理記錄
 */
export async function getOverdueExamActions(options?: {
  assignmentId?: number;
  userId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(overdueExamActions);

  if (options?.assignmentId) {
    query = query.where(eq(overdueExamActions.assignmentId, options.assignmentId)) as any;
  } else if (options?.userId) {
    query = query.where(eq(overdueExamActions.userId, options.userId)) as any;
  }

  const limit = options?.limit || 50;
  const actions = await query.limit(limit);

  return actions;
}

