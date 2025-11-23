import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const deleteUserMutation = trpc.users.delete.useMutation();
  const utils = trpc.useUtils();

  const handleRoleChange = async (openId: string, role: "admin" | "editor" | "viewer" | "pending") => {
    try {
      await updateRoleMutation.mutateAsync({ openId, role });
      toast.success("角色已更新");
      utils.users.list.invalidate();
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  const handleDelete = async (openId: string) => {
    if (!confirm("確定要刪除此使用者嗎？刪除後該使用者需要重新審核才能登入。")) {
      return;
    }
    try {
      await deleteUserMutation.mutateAsync(openId);
      toast.success("使用者已刪除");
      utils.users.list.invalidate();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "editor":
        return "secondary";
      case "viewer":
        return "outline";
      case "pending":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "管理員";
      case "editor":
        return "編輯者";
      case "viewer":
        return "訪客";
      case "pending":
        return "待審核";
      default:
        return role;
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>無權限</CardTitle>
            <CardDescription>您沒有權限存取此頁面</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">使用者管理</h1>
          <p className="text-muted-foreground mt-2">管理系統使用者與權限設定</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>使用者列表</CardTitle>
            <CardDescription>
              共 {users?.length || 0} 位使用者
              {users?.filter((u) => u.role === "pending").length ? (
                <Badge variant="destructive" className="ml-2">
                  {users.filter((u) => u.role === "pending").length} 位待審核
                </Badge>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>電子郵件</TableHead>
                    <TableHead>登入方式</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>最後登入</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.loginMethod || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleRoleChange(user.openId, value as any)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">管理員</SelectItem>
                            <SelectItem value="editor">編輯者</SelectItem>
                            <SelectItem value="viewer">訪客</SelectItem>
                            <SelectItem value="pending">待審核</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.lastSignedIn
                          ? new Date(user.lastSignedIn).toLocaleDateString("zh-TW")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.openId)}
                          disabled={user.openId === currentUser?.openId}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

