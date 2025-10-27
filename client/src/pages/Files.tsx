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
import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearch } from "wouter";
import { Search, FileText, Sparkles, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { debounce } from "lodash";

export default function Files() {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(useSearch());
  const urlSearch = searchParams.get("search") || "";
  
  const [searchKeyword, setSearchKeyword] = useState(urlSearch);
  const [debouncedKeyword, setDebouncedKeyword] = useState(urlSearch);
  
  // 初始化URL參數搜尋
  useEffect(() => {
    if (urlSearch) {
      setSearchKeyword(urlSearch);
      setDebouncedKeyword(urlSearch);
    }
  }, [urlSearch]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("");

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedKeyword(value);
        setCurrentPage(1); // Reset to first page on search
      }, 500),
    []
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchKeyword(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const { data: filesData, isLoading } = trpc.files.list.useQuery({
    page: currentPage,
    pageSize: 20,
    departmentId: selectedDepartment !== "all" ? parseInt(selectedDepartment) : undefined,
    employeeId: selectedEmployee !== "all" ? parseInt(selectedEmployee) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    keyword: debouncedKeyword || undefined,
  });

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const analysisMutation = trpc.analysis.create.useMutation();
  const deleteFileMutation = trpc.files.delete.useMutation();
  const utils = trpc.useUtils();

  const files = filesData?.files || [];
  const totalPages = filesData?.totalPages || 1;
  const total = filesData?.total || 0;

  // Filter employees by selected department
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === "all") return employees;
    return employees?.filter((emp) => emp.departmentId === parseInt(selectedDepartment));
  }, [employees, selectedDepartment]);

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
      await analysisMutation.mutateAsync({
        fileId: selectedFile,
        analysisType: "general",
        prompt: analysisPrompt,
      });
      toast.success("AI 分析完成");
      setAnalysisPrompt("");
      setSelectedFile(null);
    } catch (error) {
      toast.error("AI 分析失敗");
    }
  };

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

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
    setSelectedEmployee("all"); // Reset employee filter
    setCurrentPage(1);
  };

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
    setCurrentPage(1);
  };

  const handleDateChange = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchKeyword("");
    setDebouncedKeyword("");
    setSelectedDepartment("all");
    setSelectedEmployee("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    debouncedKeyword || 
    selectedDepartment !== "all" || 
    selectedEmployee !== "all" || 
    startDate || 
    endDate;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">檔案管理</h1>
            <p className="text-muted-foreground">
              管理所有考核檔案，支援搜尋、篩選與 AI 分析
            </p>
          </div>
          {(user?.role === "admin" || user?.role === "editor") && <FileUpload />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>進階篩選</CardTitle>
            <CardDescription>
              使用多條件組合篩選檔案
              {hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-2"
                >
                  清除所有篩選
                </Button>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 關鍵字搜尋 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">關鍵字搜尋</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜尋檔案內容..."
                    value={searchKeyword}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* 部門篩選 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">部門</label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
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
              </div>

              {/* 人員篩選 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">人員</label>
                <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇人員" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有人員</SelectItem>
                    {filteredEmployees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 開始日期 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">開始日期</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleDateChange();
                  }}
                />
              </div>

              {/* 結束日期 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">結束日期</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    handleDateChange();
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>檔案列表</CardTitle>
                <CardDescription>
                  共 {total} 個檔案
                  {hasActiveFilters && " (已篩選)"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hasActiveFilters ? "沒有符合條件的檔案" : "尚無檔案"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>檔案名稱</TableHead>
                      <TableHead>人員</TableHead>
                      <TableHead>上傳日期</TableHead>
                      <TableHead>檔案大小</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file: any) => {
                      const employee = employees?.find((e) => e.id === file.employeeId);
                      const department = departments?.find((d) => d.id === employee?.departmentId);
                      return (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {highlightText(file.filename, debouncedKeyword)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{employee?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {department?.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(file.uploadDate).toLocaleDateString("zh-TW")}
                          </TableCell>
                          <TableCell>
                            {(file.fileSize / 1024).toFixed(2)} KB
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.fileUrl, "_blank")}
                              >
                                下載
                              </Button>
                              {(user?.role === "admin" || user?.role === "editor") && (
                                <>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
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
                                          placeholder="例如：請分析這份考核問答的優缺點..."
                                          value={analysisPrompt}
                                          onChange={(e) => setAnalysisPrompt(e.target.value)}
                                          rows={4}
                                        />
                                        <Button
                                          onClick={handleAnalysis}
                                          disabled={analysisMutation.isPending}
                                          className="w-full"
                                        >
                                          {analysisMutation.isPending ? "分析中..." : "開始分析"}
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(file.id, file.filename)}
                                    disabled={deleteFileMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      第 {currentPage} 頁，共 {totalPages} 頁
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一頁
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一頁
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

