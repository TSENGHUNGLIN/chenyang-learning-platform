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



/**
 * ========================================
 * 補考通知系統
 * ========================================
 */

import { notifications, makeupExams, InsertNotification } from "../drizzle/schema";
import { sql, and, lte, gte } from "drizzle-orm";

/**
 * 獲取使用者的通知列表
 */
export async function getUserNotifications(userId: number, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, 0));
    }

    const results = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return results;
  } catch (error) {
    console.error("[notificationHelper] 獲取通知列表失敗:", error);
    return [];
  }
}

/**
 * 標記通知為已讀
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    return true;
  } catch (error) {
    console.error("[notificationHelper] 標記通知為已讀失敗:", error);
    return false;
  }
}

/**
 * 標記所有通知為已讀
 */
export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));

    return true;
  } catch (error) {
    console.error("[notificationHelper] 標記所有通知為已讀失敗:", error);
    return false;
  }
}

/**
 * 刪除通知
 */
export async function deleteNotification(notificationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  try {
    await db.delete(notifications).where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("[notificationHelper] 刪除通知失敗:", error);
    return false;
  }
}

/**
 * 獲取未讀通知數量
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 0;
  }

  try {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));

    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error("[notificationHelper] 獲取未讀通知數量失敗:", error);
    return 0;
  }
}

/**
 * 發送補考提醒通知（定時任務呼叫）
 * 檢查即將到期的補考（3天內、1天內）
 */
export async function sendMakeupExamReminders(): Promise<{
  success: boolean;
  remindersSent: number;
  message: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, remindersSent: 0, message: "資料庫連線失敗" };
  }

  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // 獲取即將到期的補考（狀態為 scheduled 且截止日期在未來3天內）
    const upcomingMakeups = await db
      .select({
        makeup: makeupExams,
        user: users,
        exam: exams,
      })
      .from(makeupExams)
      .leftJoin(users, eq(makeupExams.userId, users.id))
      .leftJoin(exams, eq(makeupExams.examId, exams.id))
      .where(
        and(
          eq(makeupExams.status, "scheduled"),
          lte(makeupExams.makeupDeadline, threeDaysLater),
          gte(makeupExams.makeupDeadline, now)
        )
      );

    let remindersSent = 0;

    for (const item of upcomingMakeups) {
      if (!item.makeup.makeupDeadline || !item.user || !item.exam) {
        continue;
      }

      const deadline = new Date(item.makeup.makeupDeadline);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // 檢查是否已經發送過相同類型的提醒
      const existingReminder = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, item.user.id),
            eq(notifications.relatedMakeupExamId, item.makeup.id),
            eq(
              notifications.notificationType,
              daysUntilDeadline <= 1 ? "makeup_reminder_1day" : "makeup_reminder_3days"
            )
          )
        )
        .limit(1);

      if (existingReminder.length > 0) {
        continue; // 已經發送過，跳過
      }

      // 發送提醒通知
      const notificationData: InsertNotification = {
        userId: item.user.id,
        notificationType:
          daysUntilDeadline <= 1 ? "makeup_reminder_1day" : "makeup_reminder_3days",
        title: `補考提醒：${item.exam.title}`,
        content: `您的補考「${item.exam.title}」將在 ${daysUntilDeadline} 天後截止（${deadline.toLocaleString("zh-TW")}），請盡快完成考試。`,
        relatedExamId: item.makeup.examId,
        relatedMakeupExamId: item.makeup.id,
        relatedAssignmentId: item.makeup.makeupAssignmentId,
      };

      await db.insert(notifications).values(notificationData);
      remindersSent++;
    }

    return {
      success: true,
      remindersSent,
      message: `成功發送 ${remindersSent} 條補考提醒通知`,
    };
  } catch (error) {
    console.error("[notificationHelper] 發送補考提醒失敗:", error);
    return { success: false, remindersSent: 0, message: "發送補考提醒失敗" };
  }
}

/**
 * 通知管理員有新的待補考考生
 */
export async function notifyAdminAboutFailedExam(
  examId: number,
  userId: number,
  makeupExamId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  try {
    // 獲取所有管理員和編輯者
    const admins = await db
      .select()
      .from(users)
      .where(sql`${users.role} IN ('admin', 'editor')`);

    if (admins.length === 0) {
      return false;
    }

    // 獲取考試和考生資訊
    const examInfo = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    const studentInfo = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (examInfo.length === 0 || studentInfo.length === 0) {
      return false;
    }

    const exam = examInfo[0];
    const student = studentInfo[0];

    // 發送通知給所有管理員
    for (const admin of admins) {
      const notificationData: InsertNotification = {
        userId: admin.id,
        notificationType: "admin_new_failed_exam",
        title: "新的待補考考生",
        content: `考生「${student.name}」在考試「${exam.title}」中未達及格標準，需要安排補考。`,
        relatedExamId: examId,
        relatedMakeupExamId: makeupExamId,
      };

      await db.insert(notifications).values(notificationData);
    }

    return true;
  } catch (error) {
    console.error("[notificationHelper] 通知管理員失敗:", error);
    return false;
  }
}

