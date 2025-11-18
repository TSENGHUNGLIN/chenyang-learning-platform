/**
 * 權限定義
 */

export type UserRole = "admin" | "editor" | "viewer" | "examinee";

export interface Permissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canUploadFiles: boolean;
  canAnalyze: boolean;
  canExport: boolean;
}

export function getPermissions(role: UserRole): Permissions {
  switch (role) {
    case "admin":
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageUsers: true,
        canUploadFiles: true,
        canAnalyze: true,
        canExport: true,
      };
    case "editor":
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canManageUsers: false,
        canUploadFiles: true,
        canAnalyze: true,
        canExport: true,
      };
    case "viewer":
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canUploadFiles: false,
        canAnalyze: false,
        canExport: false,
      };
    case "examinee":
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canUploadFiles: false,
        canAnalyze: false,
        canExport: false,
      };
  }
}

export function hasPermission(role: UserRole, permission: keyof Permissions): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

