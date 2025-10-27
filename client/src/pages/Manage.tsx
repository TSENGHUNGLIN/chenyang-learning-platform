import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Building2, UserPlus, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Manage() {
  const { user } = useAuth();
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);

  const { data: departments, isLoading: deptLoading } = trpc.departments.list.useQuery();
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const createDeptMutation = trpc.departments.create.useMutation();
  const createEmpMutation = trpc.employees.create.useMutation();
  const utils = trpc.useUtils();

  const canManage = user?.role === "admin";

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error("請輸入部門名稱");
      return;
    }
    try {
      await createDeptMutation.mutateAsync({
        name: newDeptName,
        description: newDeptDesc || undefined,
      });
      toast.success("部門已新增");
      setNewDeptName("");
      setNewDeptDesc("");
      setIsDeptDialogOpen(false);
      utils.departments.list.invalidate();
    } catch (error) {
      toast.error("新增失敗");
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmpName.trim() || !newEmpDept) {
      toast.error("請填寫完整資料");
      return;
    }
    try {
      await createEmpMutation.mutateAsync({
        name: newEmpName,
        departmentId: parseInt(newEmpDept),
        email: newEmpEmail || undefined,
      });
      toast.success("人員已新增");
      setNewEmpName("");
      setNewEmpDept("");
      setNewEmpEmail("");
      setIsEmpDialogOpen(false);
      utils.employees.list.invalidate();
    } catch (error) {
      toast.error("新增失敗");
    }
  };

  const getDepartmentName = (deptId: number) => {
    return departments?.find((d) => d.id === deptId)?.name || "-";
  };

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">您沒有權限存取此頁面</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">部門與人員管理</h1>
          <p className="text-muted-foreground mt-2">管理組織架構與人員資料</p>
        </div>

        {/* 部門管理 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  部門管理
                </CardTitle>
                <CardDescription>管理所有部門資料</CardDescription>
              </div>
              <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新增部門
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增部門</DialogTitle>
                    <DialogDescription>建立新的部門資料</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">部門名稱 *</Label>
                      <Input
                        id="dept-name"
                        placeholder="例如：業務部"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept-desc">部門描述</Label>
                      <Input
                        id="dept-desc"
                        placeholder="選填"
                        value={newDeptDesc}
                        onChange={(e) => setNewDeptDesc(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleCreateDepartment}
                      className="w-full"
                      disabled={createDeptMutation.isPending}
                    >
                      確認新增
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {deptLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>部門名稱</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>人員數量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments?.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.description || "-"}</TableCell>
                      <TableCell>
                        {employees?.filter((e) => e.departmentId === dept.id).length || 0} 人
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 人員管理 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  人員管理
                </CardTitle>
                <CardDescription>管理所有人員資料</CardDescription>
              </div>
              <Dialog open={isEmpDialogOpen} onOpenChange={setIsEmpDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新增人員
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增人員</DialogTitle>
                    <DialogDescription>建立新的人員資料</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emp-name">姓名 *</Label>
                      <Input
                        id="emp-name"
                        placeholder="例如：王小明"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-dept">部門 *</Label>
                      <Select value={newEmpDept} onValueChange={setNewEmpDept}>
                        <SelectTrigger id="emp-dept">
                          <SelectValue placeholder="選擇部門" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-email">電子郵件</Label>
                      <Input
                        id="emp-email"
                        type="email"
                        placeholder="選填"
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleCreateEmployee}
                      className="w-full"
                      disabled={createEmpMutation.isPending}
                    >
                      確認新增
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {empLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>部門</TableHead>
                    <TableHead>電子郵件</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                      <TableCell>{emp.email || "-"}</TableCell>
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

