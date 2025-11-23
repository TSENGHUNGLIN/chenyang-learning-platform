/**
 * 權限定義
 */

export type UserRole = "admin" | "editor" | "viewer" | "examinee";

export interface Permissions {
  canView: boolean;          // 可以查看自己的考試和成績
  canViewAll: boolean;       // 可以查看所有內容（考試列表、題庫、統計等）
  canEdit: boolean;          // 可以編輯和建立內容
  canDelete: boolean;        // 可以刪除內容
  canManageUsers: boolean;   // 可以管理使用者
  canUploadFiles: boolean;   // 可以上傳檔案
  canAnalyze: boolean;       // 可以使用AI分析功能
  canExport: boolean;        // 可以匯出報表
  canTakeExam: boolean;      // 可以參加考試
}

export function getPermissions(role: UserRole): Permissions {
  switch (role) {
    case "admin":
      return {
        canView: true,
        canViewAll: true,
        canEdit: true,
        canDelete: true,
        canManageUsers: true,
        canUploadFiles: true,
        canAnalyze: true,
        canExport: true,
        canTakeExam: true,
      };
    case "editor":
      return {
        canView: true,
        canViewAll: true,
        canEdit: true,
        canDelete: false,
        canManageUsers: false,
        canUploadFiles: true,
        canAnalyze: true,
        canExport: true,
        canTakeExam: true,
      };
    case "viewer":
      return {
        canView: true,
        canViewAll: true,       // viewer可以查看所有內容
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canUploadFiles: false,
        canAnalyze: false,
        canExport: false,
        canTakeExam: true,      // viewer可以參加考試
      };
    case "examinee":
      return {
        canView: true,
        canViewAll: false,      // examinee只能看被指派的考試
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canUploadFiles: false,
        canAnalyze: false,
        canExport: false,
        canTakeExam: true,      // examinee可以參加考試
      };
  }
}

export function hasPermission(role: UserRole, permission: keyof Permissions): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

