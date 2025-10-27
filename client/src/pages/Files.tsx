import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useState } from "react";
import { Search, FileText, Sparkles, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Files() {
  const { user } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("");

  const { data: files, isLoading } = trpc.files.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: searchResults } = trpc.files.search.useQuery(searchKeyword, {
    enabled: searchKeyword.length > 0,
  });
  const analysisMutation = trpc.analysis.create.useMutation();
  const deleteFileMutation = trpc.files.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredFiles = (searchKeyword ? searchResults : files)?.filter((file) => {
    if (selectedDepartment !== "all") {
      const employee = employees?.find((e) => e.id === file.employeeId);
      if (employee?.departmentId !== parseInt(selectedDepartment)) return false;
    }
    if (selectedEmployee !== "all" && file.employeeId !== parseInt(selectedEmployee)) {
      return false;
    }
    return true;
  });

  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleAnalysis = async () => {
    if (!selectedFile || !analysisPrompt) {
      toast.error("請選擇檔案並輸入分析提示");
      return;
    }
    try {
      const result = await analysisMutation.mutateAsync({
        fileId: selectedFile,
        analysisType: "general",
        prompt: analysisPrompt,
      });
      toast.success("分析完成");
      // Show analysis result in a dialog or new page
      alert(`分析結果：\n${result.result}`);
    } catch (error) {
      toast.error("分析失敗");
    }
  };

  const getEmployeeName = (employeeId: number) => {
    return employees?.find((e) => e.id === employeeId)?.name || "-";
  };

  const getDepartmentName = (employeeId: number) => {
    const employee = employees?.find((e) => e.id === employeeId);
    if (!employee) return "-";
    return departments?.find((d) => d.id === employee.departmentId)?.name || "-";
  };

  const canUpload = user?.role === "admin" || user?.role === "editor";
  const canAnalyze = user?.role === "admin" || user?.role === "editor";
  const canDelete = user?.role === "admin" || user?.role === "editor";

  const handleDelete = async (fileId: number, filename: string) => {
    if (!confirm(`確定要刪除檔案「${filename}」嗎？`)) {
      return;
    }
    try {
      await deleteFileMutation.mutateAsync(fileId);
      toast.success("檔案已刪除");
      utils.files.list.invalidate();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">檔案管理</h1>
            <p className="text-muted-foreground mt-2">管理所有上傳的考核問答檔案</p>
          </div>
          {canUpload && <FileUpload />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>搜尋與篩選</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋檔案內容..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="選擇部門" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有部門</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="選擇人員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有人員</SelectItem>
                  {employees
                    ?.filter(
                      (emp) =>
                        selectedDepartment === "all" ||
                        emp.departmentId === parseInt(selectedDepartment)
                    )
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>檔案列表</CardTitle>
            <CardDescription>共 {filteredFiles?.length || 0} 個檔案</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>檔案名稱</TableHead>
                    <TableHead>部門</TableHead>
                    <TableHead>人員</TableHead>
                    <TableHead>上傳日期</TableHead>
                    <TableHead>檔案大小</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles?.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {highlightText(file.filename, searchKeyword)}
                        </div>
                      </TableCell>
                      <TableCell>{getDepartmentName(file.employeeId)}</TableCell>
                      <TableCell>{getEmployeeName(file.employeeId)}</TableCell>
                      <TableCell>
                        {new Date(file.uploadDate).toLocaleDateString("zh-TW")}
                      </TableCell>
                      <TableCell>{(file.fileSize / 1024).toFixed(2)} KB</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                            查看
                          </a>
                        </Button>
                        {canAnalyze && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFile(file.id)}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
                                AI 分析
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>AI 分析</DialogTitle>
                                <DialogDescription>
                                  輸入您想要分析的問題或提示
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="例如：請分析此考核問答的優缺點..."
                                  value={analysisPrompt}
                                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                                  rows={5}
                                />
                                <Button onClick={handleAnalysis} className="w-full">
                                  開始分析
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file.id, file.filename)}
                            disabled={deleteFileMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
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

