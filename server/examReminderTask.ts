/**
 * 考試截止日期提醒定時任務
 * 每天執行一次，檢查即將到期的考試並發送提醒
 */

import { getDb } from "./db";
import { eq, and, lt, gte, isNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

/**
 * 檢查並發送考試提醒
 */
export async function checkAndSendExamReminders() {
  const db = await getDb();
  if (!db) {
    console.warn("[ExamReminder] Database not available");
    return;
  }

  const { examAssignments, exams, users, examReminders } = await import("../drizzle/schema");

  try {
    // 取得所有待考試的指派
    const pendingAssignments = await db
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
          eq(examAssignments.status, "pending"),
          isNull(examAssignments.submittedAt)
        )
      );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const fourDaysLater = new Date(today);
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);

    let remindersSent = 0;

    for (const item of pendingAssignments) {
      if (!item.assignment.deadline) continue;

      const deadline = new Date(item.assignment.deadline);
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

      // 計算距離截止日期的天數
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let reminderType: "3days" | "1day" | "today" | null = null;

      if (daysUntilDeadline === 3) {
        reminderType = "3days";
      } else if (daysUntilDeadline === 1) {
        reminderType = "1day";
      } else if (daysUntilDeadline === 0) {
        reminderType = "today";
      }

      if (!reminderType) continue;

      // 檢查是否已發送過此類型的提醒
      const existingReminder = await db
        .select()
        .from(examReminders)
        .where(
          and(
            eq(examReminders.assignmentId, item.assignment.id),
            eq(examReminders.reminderType, reminderType)
          )
        )
        .limit(1);

      if (existingReminder.length > 0) {
        continue; // 已發送過，跳過
      }

      // 發送提醒
      const userName = item.user?.name || item.user?.email || "考生";
      const examTitle = item.exam?.title || "考試";
      const deadlineStr = deadline.toLocaleDateString("zh-TW");

      let message = "";
      if (reminderType === "3days") {
        message = `【考試提醒】${userName} 有一場考試「${examTitle}」將在 3 天後（${deadlineStr}）截止，請提醒考生盡快完成。`;
      } else if (reminderType === "1day") {
        message = `【考試提醒】${userName} 有一場考試「${examTitle}」將在明天（${deadlineStr}）截止，請提醒考生盡快完成。`;
      } else if (reminderType === "today") {
        message = `【考試提醒】${userName} 有一場考試「${examTitle}」今天（${deadlineStr}）截止，請提醒考生盡快完成。`;
      }

      const success = await notifyOwner({
        title: "考試截止提醒",
        content: message,
      });

      if (success) {
        // 記錄提醒
        await db.insert(examReminders).values({
          assignmentId: item.assignment.id,
          reminderType,
        });
        remindersSent++;
      }
    }

    console.log(`[ExamReminder] Sent ${remindersSent} reminders`);
    return { success: true, remindersSent };
  } catch (error) {
    console.error("[ExamReminder] Error:", error);
    return { success: false, error };
  }
}

/**
 * 手動觸發提醒檢查（用於測試）
 */
export async function triggerReminderCheck() {
  console.log("[ExamReminder] Manual trigger started");
  return await checkAndSendExamReminders();
}

