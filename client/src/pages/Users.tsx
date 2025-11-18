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
import { Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const deleteUserMutation = trpc.users.delete.useMutation();
  const utils = trpc.useUtils();
  
  // 新增使用者對話框狀態
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "examinee" as "admin" | "editor" | "viewer" | "examinee"
  });

  const handleRoleChange = async (openId: string, role: "admin" | "editor" | "viewer" | "examinee") => {
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
      case "examinee":
        return "secondary";
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
      case "examinee":
        return "考試人員";
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>使用者列表</CardTitle>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    新增使用者
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>新增使用者</DialogTitle>
                    <DialogDescription>
                      輸入使用者資訊並選擇角色
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">姓名 *</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="例如：張三"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">電子郵件 *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="例如：zhangsan@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">角色 *</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">管理員</Badge>
                              <span className="text-sm text-muted-foreground">完整權限</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="editor">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">編輯者</Badge>
                              <span className="text-sm text-muted-foreground">可編輯題庫和考試</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">檢視者</Badge>
                              <span className="text-sm text-muted-foreground">只能查看</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="examinee">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">考試人員</Badge>
                              <span className="text-sm text-muted-foreground">只能參加考試</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={() => {
                      // TODO: 實作新增使用者API呼叫
                      toast.info("功能開發中...");
                    }}>
                      確認新增
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              共 {users?.length || 0} 位使用者
              {users?.filter((u) => u.role === "examinee").length ? (
                <Badge variant="secondary" className="ml-2">
                  {users.filter((u) => u.role === "examinee").length} 位考試人員
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
                            <SelectItem value="examinee">考試人員</SelectItem>
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

