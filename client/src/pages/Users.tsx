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
import { Trash2, UserPlus, Edit2, Settings, Building2, Users as UsersIcon, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const deleteUserMutation = trpc.users.delete.useMutation();
  const updateNameMutation = trpc.users.updateName.useMutation();
  const utils = trpc.useUtils();
  
  // 新增使用者對話框狀態
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "examinee" as "admin" | "editor" | "viewer" | "examinee"
  });
  
  // 編輯名稱對話框狀態
  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  
  // 編輯者權限管理對話框狀態
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<any>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // 查詢部門和使用者列表
  const { data: departments } = trpc.departments.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const setDepartmentAccessMutation = trpc.users.setDepartmentAccess.useMutation();
  const setUserAccessMutation = trpc.users.setUserAccess.useMutation();
  const { data: departmentAccess } = trpc.users.getDepartmentAccess.useQuery(
    permissionUser?.id || 0,
    { enabled: !!permissionUser }
  );
  const { data: userAccess } = trpc.users.getUserAccess.useQuery(
    permissionUser?.id || 0,
    { enabled: !!permissionUser }
  );
  
  // 權限預覽查詢（即時顯示可訪問的考生清單）
  const { data: accessPreview, isLoading: isPreviewLoading } = trpc.users.previewAccess.useQuery(
    {
      departmentIds: selectedDepartments,
      userIds: selectedUsers,
    },
    {
      enabled: isPermissionDialogOpen && (selectedDepartments.length > 0 || selectedUsers.length > 0),
    }
  );

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
  
  const handleEditName = (user: any) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setIsEditNameDialogOpen(true);
  };
  
  const handleSaveName = async () => {
    if (!editingUser || !editName.trim()) {
      toast.error("請輸入名稱");
      return;
    }
    try {
      await updateNameMutation.mutateAsync({
        openId: editingUser.openId,
        name: editName.trim()
      });
      toast.success("名稱已更新");
      utils.users.list.invalidate();
      setIsEditNameDialogOpen(false);
      setEditingUser(null);
      setEditName("");
    } catch (error) {
      toast.error("更新失敗");
    }
  };
  
  const handleManagePermission = (user: any) => {
    setPermissionUser(user);
    setIsPermissionDialogOpen(true);
  };
  
  // 當權限資料載入完成時，更新選擇狀態
  useEffect(() => {
    if (departmentAccess) {
      setSelectedDepartments(departmentAccess.map(d => d.departmentId));
    }
  }, [departmentAccess]);
  
  useEffect(() => {
    if (userAccess) {
      setSelectedUsers(userAccess.map(u => u.userId));
    }
  }, [userAccess]);
  
  const handleSavePermissions = async () => {
    if (!permissionUser) return;
    
    try {
      await setDepartmentAccessMutation.mutateAsync({
        editorId: permissionUser.id,
        departmentIds: selectedDepartments
      });
      
      await setUserAccessMutation.mutateAsync({
        editorId: permissionUser.id,
        userIds: selectedUsers
      });
      
      toast.success("權限已更新");
      setIsPermissionDialogOpen(false);
      setPermissionUser(null);
      setSelectedDepartments([]);
      setSelectedUsers([]);
    } catch (error) {
      toast.error("更新失敗");
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
                        <div className="flex items-center justify-end gap-2">
                          {user.role === "editor" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManagePermission(user)}
                              title="管理權限"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditName(user)}
                            title="編輯名稱"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.openId)}
                            disabled={user.openId === currentUser?.openId}
                            title="刪除使用者"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 編輯名稱對話框 */}
      <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>編輯使用者名稱</DialogTitle>
            <DialogDescription>
              更新使用者的顯示名稱，此名稱將在系統中顯示
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">名稱</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="請輸入名稱"
              />
            </div>
            {editingUser && (
              <div className="text-sm text-muted-foreground">
                <p>電子郵件：{editingUser.email || "-"}</p>
                <p>登入方式：{editingUser.loginMethod || "-"}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditNameDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveName}>
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 編輯者權限管理對話框 */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>管理編輯者權限</DialogTitle>
            <DialogDescription>
              設定 {permissionUser?.name || "編輯者"} 可以訪問的部門和考生
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 部門權限 */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                部門訪問權限
              </Label>
              <p className="text-sm text-muted-foreground">
                選擇編輯者可以管理的部門，將自動獲得該部門所有考生的訪問權
              </p>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-md">
                {departments?.map((dept) => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept.id}`}
                      checked={selectedDepartments.includes(dept.id)}
                      onCheckedChange={() => {
                        setSelectedDepartments(prev =>
                          prev.includes(dept.id)
                            ? prev.filter(id => id !== dept.id)
                            : [...prev, dept.id]
                        );
                      }}
                    />
                    <Label
                      htmlFor={`dept-${dept.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {dept.name}
                    </Label>
                  </div>
                ))}
                {(!departments || departments.length === 0) && (
                  <p className="text-sm text-muted-foreground col-span-2">沒有可用的部門</p>
                )}
              </div>
            </div>
            
            {/* 考生權限 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />
                  考生訪問權限
                </Label>
                {allUsers && allUsers.filter(u => u.role === 'examinee').length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const examinees = allUsers.filter(u => u.role === 'examinee');
                        setSelectedUsers(examinees.map(e => e.id));
                      }}
                    >
                      全選
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers([])}
                    >
                      清除
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                選擇特定考生，編輯者將只能看到這些考生的資料
              </p>
              
              {/* 搜尋框 */}
              {allUsers && allUsers.filter(u => u.role === 'examinee').length > 5 && (
                <div className="relative">
                  <Input
                    placeholder="搜尋考生姓名或郵件..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  <UsersIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-md max-h-64 overflow-y-auto">
                {allUsers?.filter(u => u.role === 'examinee')
                  .filter(u => {
                    if (!userSearchQuery) return true;
                    const query = userSearchQuery.toLowerCase();
                    return (
                      (u.name && u.name.toLowerCase().includes(query)) ||
                      (u.email && u.email.toLowerCase().includes(query))
                    );
                  })
                  .map((examinee) => (
                  <div key={examinee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${examinee.id}`}
                      checked={selectedUsers.includes(examinee.id)}
                      onCheckedChange={() => {
                        setSelectedUsers(prev =>
                          prev.includes(examinee.id)
                            ? prev.filter(id => id !== examinee.id)
                            : [...prev, examinee.id]
                        );
                      }}
                    />
                    <Label
                      htmlFor={`user-${examinee.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <div className="flex flex-col">
                        <span>{examinee.name || examinee.email || `使用者 ${examinee.id}`}</span>
                        {examinee.email && examinee.name && (
                          <span className="text-xs text-muted-foreground">{examinee.email}</span>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
                {(!allUsers || allUsers.filter(u => u.role === 'examinee').length === 0) && (
                  <p className="text-sm text-muted-foreground col-span-2">沒有可用的考生</p>
                )}
                {allUsers && allUsers.filter(u => u.role === 'examinee').length > 0 && 
                 allUsers.filter(u => u.role === 'examinee').filter(u => {
                   if (!userSearchQuery) return true;
                   const query = userSearchQuery.toLowerCase();
                   return (
                     (u.name && u.name.toLowerCase().includes(query)) ||
                     (u.email && u.email.toLowerCase().includes(query))
                   );
                 }).length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2">沒有符合搜尋條件的考生</p>
                )}
              </div>
              
              {/* 已選擇計數 */}
              {selectedUsers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  已選擇 {selectedUsers.length} 位考生
                </p>
              )}
            </div>
            
            {/* 權限預覽區塊 */}
            {(selectedDepartments.length > 0 || selectedUsers.length > 0) && (
              <div className="space-y-3 mt-6 pt-6 border-t">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  權限預覽
                </Label>
                <p className="text-sm text-muted-foreground">
                  根據目前選擇，此編輯者將可以訪問以下考生：
                </p>
                
                {isPreviewLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : accessPreview && accessPreview.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-md">
                      <span className="text-sm font-medium text-blue-900">
                        總計可訪問 {accessPreview.length} 位考生
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">姓名</th>
                            <th className="px-3 py-2 text-left font-medium">郵件</th>
                            <th className="px-3 py-2 text-left font-medium">來源</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {accessPreview.map((examinee: any) => (
                            <tr key={examinee.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{examinee.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{examinee.email || '-'}</td>
                              <td className="px-3 py-2">
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                  {examinee.source}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>沒有可訪問的考生</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPermissionDialogOpen(false);
              setPermissionUser(null);
              setSelectedDepartments([]);
              setSelectedUsers([]);
              setUserSearchQuery("");
            }}>
              取消
            </Button>
            <Button onClick={handleSavePermissions}>
              儲存權限
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

