/**
 * 權限預覽輔助函數
 * 根據部門和個別考生權限，計算編輯者可訪問的考生列表
 */

import { getDb } from "./db";
import { employees, users } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";

/**
 * 預覽編輯者可訪問的考生列表
 * @param departmentIds 部門ID列表
 * @param userIds 個別考生ID列表
 * @returns 可訪問的考生列表（去重）
 */
export async function previewAccessibleExaminees(
  departmentIds: number[],
  userIds: number[]
): Promise<Array<{ id: number; name: string; email: string | null; source: string }>> {
  const db = await getDb();
  if (!db) {
    throw new Error("資料庫連線失敗");
  }

  const accessibleExaminees: Array<{ id: number; name: string; email: string | null; source: string }> = [];
  const seenIds = new Set<number>();

  // 1. 從部門權限獲取考生
  if (departmentIds.length > 0) {
    const employeesInDepartments = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(inArray(employees.departmentId, departmentIds));

    for (const emp of employeesInDepartments) {
      if (!seenIds.has(emp.id)) {
        seenIds.add(emp.id);
        accessibleExaminees.push({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          source: `部門權限 (ID: ${emp.departmentId})`,
        });
      }
    }
  }

  // 2. 從個別考生權限獲取考生
  if (userIds.length > 0) {
    const individualUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          inArray(users.id, userIds),
          eq(users.role, "examinee")
        )
      );

    for (const user of individualUsers) {
      if (!seenIds.has(user.id)) {
        seenIds.add(user.id);
        accessibleExaminees.push({
          id: user.id,
          name: user.name || "未知",
          email: user.email,
          source: "個別權限",
        });
      }
    }
  }

  return accessibleExaminees;
}

