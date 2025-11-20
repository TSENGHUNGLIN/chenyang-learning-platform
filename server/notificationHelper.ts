import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { users, exams, examAssignments } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * 通知類型
 */
export type NotificationType =
  | "exam_created"
  | "exam_assigned"
  | "score_published"
  | "exam_deadline_reminder"
  | "question_pending_review";

/**
 * 發送考試建立通知給管理員
 */
export async function notifyExamCreated(examId: number, examTitle: string, creatorName: string) {
  try {
    await notifyOwner({
      title: "新考試已建立",
      content: `${creatorName} 建立了新考試：${examTitle}`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send exam created notification:", error);
    return false;
  }
}

/**
 * 發送考試指派通知給考生
 * 注意：目前系統只支援 notifyOwner，此函數為未來擴展預留
 */
export async function notifyExamAssigned(examId: number, userIds: number[]) {
  const db = await getDb();
  if (!db) return false;

  try {
    // 獲取考試資訊
    const examData = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (examData.length === 0) return false;

    const exam = examData[0];

    // 獲取考生資訊
    const usersData = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    // 發送通知給管理員（記錄指派動作）
    await notifyOwner({
      title: "考試已指派給考生",
      content: `考試「${exam.title}」已指派給 ${usersData.length} 位考生`,
    });

    // TODO: 未來可擴展為發送通知給每位考生
    // 目前系統只支援 notifyOwner，需要等待系統支援多用戶通知功能

    return true;
  } catch (error) {
    console.error("Failed to send exam assigned notification:", error);
    return false;
  }
}

/**
 * 發送成績公布通知
 */
export async function notifyScorePublished(examId: number, assignmentId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    // 獲取考試和考生資訊
    const assignmentData = await db
      .select({
        examTitle: exams.title,
        userName: users.name,
        userEmail: users.email,
      })
      .from(examAssignments)
      .innerJoin(exams, eq(examAssignments.examId, exams.id))
      .innerJoin(users, eq(examAssignments.userId, users.id))
      .where(eq(examAssignments.id, assignmentId))
      .limit(1);

    if (assignmentData.length === 0) return false;

    const { examTitle, userName } = assignmentData[0];

    // 發送通知給管理員
    await notifyOwner({
      title: "考試成績已公布",
      content: `考生 ${userName} 的考試「${examTitle}」成績已公布`,
    });

    // TODO: 未來可擴展為發送通知給考生本人

    return true;
  } catch (error) {
    console.error("Failed to send score published notification:", error);
    return false;
  }
}

/**
 * 發送考試截止提醒
 */
export async function notifyExamDeadlineReminder(examId: number, assignmentIds: number[], daysLeft: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    // 獲取考試資訊
    const examData = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (examData.length === 0) return false;

    const exam = examData[0];

    // 發送通知給管理員
    await notifyOwner({
      title: `考試截止提醒（剩餘 ${daysLeft} 天）`,
      content: `考試「${exam.title}」即將截止，還有 ${assignmentIds.length} 位考生尚未完成`,
    });

    // TODO: 未來可擴展為發送通知給每位尚未完成的考生

    return true;
  } catch (error) {
    console.error("Failed to send exam deadline reminder:", error);
    return false;
  }
}

/**
 * 發送新題目待審核通知給管理員
 */
export async function notifyQuestionPendingReview(questionCount: number, creatorName: string) {
  try {
    await notifyOwner({
      title: "新題目待審核",
      content: `${creatorName} 新增了 ${questionCount} 道題目，請審核`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send question pending review notification:", error);
    return false;
  }
}

/**
 * 批次發送考試截止提醒（定時任務使用）
 */
export async function sendBatchExamDeadlineReminders() {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  try {
    // 查詢所有即將截止的考試（3天內、1天內）
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // 獲取所有未完成的考試指派
    const pendingAssignments = await db
      .select({
        assignmentId: examAssignments.id,
        examId: examAssignments.examId,
        examTitle: exams.title,
        deadline: examAssignments.deadline,
        userName: users.name,
      })
      .from(examAssignments)
      .innerJoin(exams, eq(examAssignments.examId, exams.id))
      .innerJoin(users, eq(examAssignments.userId, users.id))
      .where(eq(examAssignments.status, "pending"));

    // 分組：3天內截止、1天內截止
    const threeDayReminders: Record<number, number[]> = {};
    const oneDayReminders: Record<number, number[]> = {};

    for (const assignment of pendingAssignments) {
      if (!assignment.deadline) continue;

      const deadline = new Date(assignment.deadline);

      // 3天內截止
      if (deadline <= threeDaysLater && deadline > oneDayLater) {
        if (!threeDayReminders[assignment.examId]) {
          threeDayReminders[assignment.examId] = [];
        }
        threeDayReminders[assignment.examId].push(assignment.assignmentId);
      }

      // 1天內截止
      if (deadline <= oneDayLater && deadline > now) {
        if (!oneDayReminders[assignment.examId]) {
          oneDayReminders[assignment.examId] = [];
        }
        oneDayReminders[assignment.examId].push(assignment.assignmentId);
      }
    }

    // 發送提醒
    let sentCount = 0;

    for (const [examId, assignmentIds] of Object.entries(threeDayReminders)) {
      await notifyExamDeadlineReminder(parseInt(examId), assignmentIds, 3);
      sentCount++;
    }

    for (const [examId, assignmentIds] of Object.entries(oneDayReminders)) {
      await notifyExamDeadlineReminder(parseInt(examId), assignmentIds, 1);
      sentCount++;
    }

    return {
      success: true,
      message: `已發送 ${sentCount} 個考試截止提醒`,
    };
  } catch (error) {
    console.error("Failed to send batch exam deadline reminders:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

