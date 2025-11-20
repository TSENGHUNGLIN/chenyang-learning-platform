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
import { Building2, UserPlus, Trash2, Plus, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

type Department = { id: number; name: string; description: string | null };
type Employee = { id: number; name: string; departmentId: number; email: string | null };

export default function Manage() {
  const { user } = useAuth();
  const [deptFormData, setDeptFormData] = useState({ id: 0, name: "", description: "" });
  const [empFormData, setEmpFormData] = useState({ id: 0, name: "", departmentId: "", email: "" });
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [isEditingEmp, setIsEditingEmp] = useState(false);
  const [isBatchImportDialogOpen, setIsBatchImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const { data: departments, isLoading: deptLoading } = trpc.departments.list.useQuery();
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const createDeptMutation = trpc.departments.create.useMutation();
  const updateDeptMutation = trpc.departments.update.useMutation();
  const deleteDeptMutation = trpc.departments.delete.useMutation();
  const createEmpMutation = trpc.employees.create.useMutation();
  const updateEmpMutation = trpc.employees.update.useMutation();
  const deleteEmpMutation = trpc.employees.delete.useMutation();
  const batchImportMutation = trpc.employees.batchImport.useMutation();
  const utils = trpc.useUtils();

  const canManage = user?.role === "admin";

  const resetDeptForm = () => {
    setDeptFormData({ id: 0, name: "", description: "" });
    setIsEditingDept(false);
  };

  const resetEmpForm = () => {
    setEmpFormData({ id: 0, name: "", departmentId: "", email: "" });
    setIsEditingEmp(false);
  };

  const handleOpenDeptDialog = (dept?: Department) => {
    if (dept) {
      setDeptFormData({ id: dept.id, name: dept.name, description: dept.description || "" });
      setIsEditingDept(true);
    } else {
      resetDeptForm();
    }
    setIsDeptDialogOpen(true);
  };

  const handleOpenEmpDialog = (emp?: Employee) => {
    if (emp) {
      setEmpFormData({ id: emp.id, name: emp.name, departmentId: emp.departmentId.toString(), email: emp.email || "" });
      setIsEditingEmp(true);
    } else {
      resetEmpForm();
    }
    setIsEmpDialogOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!deptFormData.name.trim()) {
      toast.error("請輸入部門名稱");
      return;
    }
    try {
      if (isEditingDept) {
        await updateDeptMutation.mutateAsync({
          id: deptFormData.id,
          name: deptFormData.name,
          description: deptFormData.description || undefined,
        });
        toast.success("部門已更新");
      } else {
        await createDeptMutation.mutateAsync({
          name: deptFormData.name,
          description: deptFormData.description || undefined,
        });
        toast.success("部門已新增");
      }
      setIsDeptDialogOpen(false);
      resetDeptForm();
      utils.departments.list.invalidate();
    } catch (error) {
      toast.error(isEditingDept ? "更新失敗" : "新增失敗");
    }
  };

  const handleDeleteDepartment = async (id: number, name: string) => {
    if (!confirm(`確定要刪除部門「${name}」嗎？此操作無法復原。`)) {
      return;
    }
    try {
      await deleteDeptMutation.mutateAsync(id);
      toast.success("部門已刪除");
      utils.departments.list.invalidate();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const handleSaveEmployee = async () => {
    if (!empFormData.name.trim() || !empFormData.departmentId) {
      toast.error("請填寫完整資料");
      return;
    }
    try {
      if (isEditingEmp) {
        await updateEmpMutation.mutateAsync({
          id: empFormData.id,
          name: empFormData.name,
          departmentId: parseInt(empFormData.departmentId),
          email: empFormData.email || undefined,
        });
        toast.success("人員已更新");
      } else {
        await createEmpMutation.mutateAsync({
          name: empFormData.name,
          departmentId: parseInt(empFormData.departmentId),
          email: empFormData.email || undefined,
        });
        toast.success("人員已新增");
      }
      setIsEmpDialogOpen(false);
      resetEmpForm();
      utils.employees.list.invalidate();
    } catch (error) {
      toast.error(isEditingEmp ? "更新失敗" : "新增失敗");
    }
  };

  const handleDeleteEmployee = async (id: number, name: string) => {
    if (!confirm(`確定要刪除人員「${name}」嗎？此操作無法復原。`)) {
      return;
    }
    try {
      await deleteEmpMutation.mutateAsync(id);
      toast.success("人員已刪除");
      utils.employees.list.invalidate();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const getDepartmentName = (deptId: number) => {
    return departments?.find((d) => d.id === deptId)?.name || "-";
  };
  
  const parseCSVMutation = trpc.employees.parseCSV.useMutation();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    // 讀取檔案並傳送到後端解析
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string;
        
        // 傳送到後端解析
        const result = await parseCSVMutation.mutateAsync({ csvContent: dataUrl });
        setImportPreview(result.preview);
        
        const validCount = result.preview.filter((i: any) => i.valid).length;
        toast.success(`檔案讀取成功，共 ${result.preview.length} 筆，有效 ${validCount} 筆`);
      } catch (error: any) {
        console.error('CSV解析錯誤:', error);
        toast.error(error.message || "檔案讀取失敗，請確認檔案格式正確");
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleBatchImport = async () => {
    if (!importFile || importPreview.length === 0) {
      toast.error("請選擇檔案");
      return;
    }
    
    const validData = importPreview.filter(item => item.valid);
    if (validData.length === 0) {
      toast.error("沒有有效的資料");
      return;
    }
    
    try {
      const employees = validData.map(item => ({
        name: item.name,
        departmentId: item.departmentId,
        email: item.email
      }));
      
      await batchImportMutation.mutateAsync({ employees });
      toast.success(`成功匯入 ${validData.length} 筆資料`);
      setIsBatchImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      utils.employees.list.invalidate();
    } catch (error) {
      toast.error("匯入失敗，請稍後再試");
    }
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
              <Dialog open={isDeptDialogOpen} onOpenChange={(open) => {
                setIsDeptDialogOpen(open);
                if (!open) resetDeptForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDeptDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    新增部門
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isEditingDept ? "編輯部門" : "新增部門"}</DialogTitle>
                    <DialogDescription>
                      {isEditingDept ? "修改部門資料" : "建立新的部門資料"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">部門名稱 *</Label>
                      <Input
                        id="dept-name"
                        placeholder="例如：業務部"
                        value={deptFormData.name}
                        onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept-desc">部門描述</Label>
                      <Input
                        id="dept-desc"
                        placeholder="選填"
                        value={deptFormData.description}
                        onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={handleSaveDepartment}
                      className="w-full"
                      disabled={createDeptMutation.isPending || updateDeptMutation.isPending}
                    >
                      {isEditingDept ? "確認更新" : "確認新增"}
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
                    <TableHead className="text-right">操作</TableHead>
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
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeptDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          disabled={deleteDeptMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBatchImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  批次匯入
                </Button>
                <Dialog open={isEmpDialogOpen} onOpenChange={(open) => {
                  setIsEmpDialogOpen(open);
                  if (!open) resetEmpForm();
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenEmpDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      新增人員
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isEditingEmp ? "編輯人員" : "新增人員"}</DialogTitle>
                    <DialogDescription>
                      {isEditingEmp ? "修改人員資料" : "建立新的人員資料"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emp-name">姓名 *</Label>
                      <Input
                        id="emp-name"
                        placeholder="例如：王小明"
                        value={empFormData.name}
                        onChange={(e) => setEmpFormData({ ...empFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-dept">部門 *</Label>
                      <Select
                        value={empFormData.departmentId}
                        onValueChange={(value) => setEmpFormData({ ...empFormData, departmentId: value })}
                      >
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
                        value={empFormData.email}
                        onChange={(e) => setEmpFormData({ ...empFormData, email: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={handleSaveEmployee}
                      className="w-full"
                      disabled={createEmpMutation.isPending || updateEmpMutation.isPending}
                    >
                      {isEditingEmp ? "確認更新" : "確認新增"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
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
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                      <TableCell>{emp.email || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEmpDialog(emp)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          disabled={deleteEmpMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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
      
      {/* 批次匯入對話框 */}
      <Dialog open={isBatchImportDialogOpen} onOpenChange={setIsBatchImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>批次匯入人員</DialogTitle>
            <DialogDescription>
              上傳 CSV 檔案以批次建立人員資料
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">CSV 檔案</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                檔案格式：姓名,部門名稱,電子郵件（選填）
              </p>
              <p className="text-sm text-muted-foreground">
                範例：王小明,業務部,wang@example.com
              </p>
            </div>
            
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>預覽（共 {importPreview.length} 筆，有效 {importPreview.filter(i => i.valid).length} 筆）</Label>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead>部門</TableHead>
                        <TableHead>電子郵件</TableHead>
                        <TableHead className="w-20">狀態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item) => (
                        <TableRow key={item.index} className={!item.valid ? "bg-red-50" : ""}>
                          <TableCell>{item.index}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.departmentName}</TableCell>
                          <TableCell>{item.email || "-"}</TableCell>
                          <TableCell>
                            {item.valid ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsBatchImportDialogOpen(false);
              setImportFile(null);
              setImportPreview([]);
            }}>
              取消
            </Button>
            <Button 
              onClick={handleBatchImport}
              disabled={importPreview.length === 0 || importPreview.filter(i => i.valid).length === 0}
            >
              確認匯入 ({importPreview.filter(i => i.valid).length} 筆)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

