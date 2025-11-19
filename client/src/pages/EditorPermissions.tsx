import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Users, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditorPermissions() {
  const { user, loading: authLoading } = useAuth();
  const [selectedEditorId, setSelectedEditorId] = useState<number | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // 查詢所有使用者
  const { data: allUsers, isLoading: usersLoading } = trpc.users.list.useQuery();
  
  // 查詢所有部門
  const { data: departments, isLoading: deptsLoading } = trpc.departments.list.useQuery();
  
  // 查詢所有考生（role = examinee）
  const examinees = allUsers?.filter(u => u.role === 'examinee') || [];
  
  // 查詢所有編輯者（role = editor）
  const editors = allUsers?.filter(u => u.role === 'editor') || [];
  
  // 查詢選定編輯者的部門權限
  const { data: deptAccess, refetch: refetchDeptAccess } = trpc.users.getDepartmentAccess.useQuery(
    selectedEditorId!,
    { enabled: selectedEditorId !== null }
  );
  
  // 查詢選定編輯者的考生權限
  const { data: userAccess, refetch: refetchUserAccess } = trpc.users.getUserAccess.useQuery(
    selectedEditorId!,
    { enabled: selectedEditorId !== null }
  );
  
  // 設定部門權限 mutation
  const setDeptAccessMutation = trpc.users.setDepartmentAccess.useMutation({
    onSuccess: () => {
      toast.success("部門權限已更新");
      refetchDeptAccess();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });
  
  // 設定考生權限 mutation
  const setUserAccessMutation = trpc.users.setUserAccess.useMutation({
    onSuccess: () => {
      toast.success("考生權限已更新");
      refetchUserAccess();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 當選擇編輯者時，載入其權限設定
  const handleEditorChange = (editorId: string) => {
    const id = parseInt(editorId);
    setSelectedEditorId(id);
    
    // 重置選擇狀態
    setSelectedDepartments([]);
    setSelectedUsers([]);
  };

  // 當權限資料載入完成時，更新選擇狀態
  useEffect(() => {
    if (deptAccess) {
      setSelectedDepartments(deptAccess.map(d => d.departmentId));
    }
  }, [deptAccess]);
  
  useEffect(() => {
    if (userAccess) {
      setSelectedUsers(userAccess.map(u => u.userId));
    }
  }, [userAccess]);

  // 切換部門選擇
  const toggleDepartment = (deptId: number) => {
    setSelectedDepartments(prev =>
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  // 切換考生選擇
  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 儲存部門權限
  const handleSaveDepartments = () => {
    if (selectedEditorId === null) {
      toast.error("請先選擇編輯者");
      return;
    }
    setDeptAccessMutation.mutate({
      editorId: selectedEditorId,
      departmentIds: selectedDepartments,
    });
  };

  // 儲存考生權限
  const handleSaveUsers = () => {
    if (selectedEditorId === null) {
      toast.error("請先選擇編輯者");
      return;
    }
    setUserAccessMutation.mutate({
      editorId: selectedEditorId,
      userIds: selectedUsers,
    });
  };

  if (authLoading || usersLoading || deptsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>無權訪問</CardTitle>
            <CardDescription>只有管理員可以管理編輯者權限</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">編輯者權限管理</h1>
        <p className="text-muted-foreground">
          設定編輯者可以訪問的部門和考生資料
        </p>
      </div>

      {/* 選擇編輯者 */}
      <Card>
        <CardHeader>
          <CardTitle>選擇編輯者</CardTitle>
          <CardDescription>請先選擇要設定權限的編輯者</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleEditorChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="請選擇編輯者" />
            </SelectTrigger>
            <SelectContent>
              {editors.map(editor => (
                <SelectItem key={editor.id} value={editor.id.toString()}>
                  {editor.name || editor.email || `使用者 ${editor.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editors.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              目前沒有編輯者，請先在使用者管理頁面設定使用者角色為「編輯者」
            </p>
          )}
        </CardContent>
      </Card>

      {selectedEditorId !== null && (
        <>
          {/* 部門權限設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                部門訪問權限
              </CardTitle>
              <CardDescription>
                選擇編輯者可以訪問的部門（該部門的所有考生資料）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments?.map(dept => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept.id}`}
                      checked={selectedDepartments.includes(dept.id)}
                      onCheckedChange={() => toggleDepartment(dept.id)}
                    />
                    <Label
                      htmlFor={`dept-${dept.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {dept.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveDepartments}
                  disabled={setDeptAccessMutation.isPending}
                >
                  {setDeptAccessMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      儲存部門權限
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 考生權限設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                考生訪問權限
              </CardTitle>
              <CardDescription>
                選擇編輯者可以訪問的特定考生（不受部門限制）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examinees.map(examinee => (
                  <div key={examinee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${examinee.id}`}
                      checked={selectedUsers.includes(examinee.id)}
                      onCheckedChange={() => toggleUser(examinee.id)}
                    />
                    <Label
                      htmlFor={`user-${examinee.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {examinee.name || examinee.email || `使用者 ${examinee.id}`}
                    </Label>
                  </div>
                ))}
              </div>
              {examinees.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  目前沒有考生
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveUsers}
                  disabled={setUserAccessMutation.isPending}
                >
                  {setUserAccessMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      儲存考生權限
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

