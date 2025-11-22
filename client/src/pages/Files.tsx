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
import { Search, FileText, Sparkles, Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
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
import AnalysisResultView from "@/components/AnalysisResultView";
import { Loader2 } from "lucide-react";

export default function Files() {
  const { user } = useAuth();
  const logReadMutation = trpc.files.logRead.useMutation();
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
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [showBatchUpdateDialog, setShowBatchUpdateDialog] = useState(false);
  const [batchUpdateEmployee, setBatchUpdateEmployee] = useState<string>("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 載入搜尋歷史記錄（從 localStorage 讀取）
  useEffect(() => {
    const savedHistory = localStorage.getItem('fileSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
  }, []);

  // 儲存搜尋歷史記錄
  const saveSearchHistory = (keyword: string) => {
    if (!keyword.trim()) return;
    
    const newHistory = [keyword, ...searchHistory.filter(h => h !== keyword)].slice(0, 10); // 保留最近10筆
    setSearchHistory(newHistory);
    localStorage.setItem('fileSearchHistory', JSON.stringify(newHistory));
  };

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
    if (value.trim()) {
      saveSearchHistory(value.trim());
    }
  }, [debouncedSearch, searchHistory]);

  const { data: filesData, isLoading } = trpc.files.list.useQuery({
    page: currentPage,
    pageSize: 10,
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
  const batchUpdateMutation = trpc.files.batchUpdateEmployee.useMutation();
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

  const handleAnalyze = async (fileId: number) => {
    try {
      setShowAnalysisDialog(true);
      setAnalysisResult(null);
      
      const result = await analysisMutation.mutateAsync({
        fileId: fileId,
        analysisType: "comprehensive",
      });
      
      setAnalysisResult(result.result);
      toast.success("AI 分析完成");
    } catch (error) {
      toast.error("AI 分析失敗");
      setShowAnalysisDialog(false);
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

  const handleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map((f: any) => f.id));
    }
  };

  const handleSelectFile = (fileId: number) => {
    if (selectedFileIds.includes(fileId)) {
      setSelectedFileIds(selectedFileIds.filter(id => id !== fileId));
    } else {
      setSelectedFileIds([...selectedFileIds, fileId]);
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedFileIds.length === 0) {
      toast.error("請選擇至少一個檔案");
      return;
    }

    if (!batchUpdateEmployee) {
      toast.error("請選擇人員");
      return;
    }

    try {
      await batchUpdateMutation.mutateAsync({
        fileIds: selectedFileIds,
        employeeId: batchUpdateEmployee === "null" ? null : parseInt(batchUpdateEmployee),
      });
      toast.success(`已更新 ${selectedFileIds.length} 個檔案的人員歸屬`);
      setSelectedFileIds([]);
      setBatchUpdateEmployee("");
      setShowBatchUpdateDialog(false);
      utils.files.list.invalidate();
    } catch (error) {
      toast.error("批次更新失敗");
    }
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
          <div className="flex items-center gap-2">
            {selectedFileIds.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBatchUpdateDialog(true)}
              >
                批次修改人員（{selectedFileIds.length}）
              </Button>
            )}
            {(user?.role === "admin" || user?.role === "editor") && <FileUpload />}
          </div>
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
                {/* 搜尋歷史記錄 */}
                {searchHistory.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {searchHistory.slice(0, 5).map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          setSearchKeyword(keyword);
                          setDebouncedKeyword(keyword);
                          setCurrentPage(1);
                        }}
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
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
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.length === files.length && files.length > 0}
                          onChange={handleSelectAll}
                          className="cursor-pointer"
                        />
                      </TableHead>
                      <TableHead>檔案名稱</TableHead>
                      <TableHead>人員</TableHead>
                      <TableHead>上傳日期</TableHead>
                      <TableHead>更新日期</TableHead>
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
                            <input
                              type="checkbox"
                              checked={selectedFileIds.includes(file.id)}
                              onChange={() => handleSelectFile(file.id)}
                              className="cursor-pointer"
                            />
                          </TableCell>
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
                            {new Date(file.updatedAt).toLocaleDateString("zh-TW")}
                            <div className="text-xs text-muted-foreground">
                              {new Date(file.updatedAt).toLocaleTimeString("zh-TW", { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(file.fileSize / 1024).toFixed(2)} KB
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPreviewFile(file);
                                  setShowPreviewDialog(true);
                                  logReadMutation.mutate(file.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                預視
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  logReadMutation.mutate(file.id);
                                  window.open(file.fileUrl, "_blank");
                                }}
                              >
                                下載
                              </Button>
                              {(user?.role === "admin" || user?.role === "editor") && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAnalyze(file.id)}
                                    disabled={analysisMutation.isPending}
                                  >
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    AI 分析
                                  </Button>
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
      {/* AI分析結果對話框 */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 分析結果</DialogTitle>
            <DialogDescription>
              系統已完成檔案內容的全面分析
            </DialogDescription>
          </DialogHeader>
          {analysisResult ? (
            <AnalysisResultView result={analysisResult} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">AI 分析中，請稍候...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 檔案預視對話框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewFile?.filename}
            </DialogTitle>
            <DialogDescription>
              檔案大小：{previewFile && (previewFile.fileSize / 1024).toFixed(2)} KB
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile && (
              <div className="space-y-4">
                {/* PDF預視 */}
                {previewFile.filename.toLowerCase().endsWith('.pdf') && (
                  <iframe
                    src={previewFile.fileUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title="PDF Preview"
                  />
                )}
                
                {/* 圖片預視 */}
                {(previewFile.filename.toLowerCase().endsWith('.jpg') ||
                  previewFile.filename.toLowerCase().endsWith('.jpeg') ||
                  previewFile.filename.toLowerCase().endsWith('.png') ||
                  previewFile.filename.toLowerCase().endsWith('.gif')) && (
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.filename}
                    className="w-full h-auto rounded-lg"
                  />
                )}
                
                {/* Word/文字檔案預視（顯示提取的文字） */}
                {(previewFile.filename.toLowerCase().endsWith('.docx') ||
                  previewFile.filename.toLowerCase().endsWith('.doc') ||
                  previewFile.filename.toLowerCase().endsWith('.txt')) && (
                  <div className="p-6 bg-muted rounded-lg">
                    {previewFile.extractedText ? (
                      <div className="whitespace-pre-wrap text-sm">
                        {previewFile.extractedText}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>無法預視此檔案，請下載後查看</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => window.open(previewFile.fileUrl, '_blank')}
                        >
                          下載檔案
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 其他檔案類型 */}
                {!previewFile.filename.toLowerCase().match(/\.(pdf|jpg|jpeg|png|gif|docx|doc|txt)$/) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">此檔案類型不支援預視</p>
                    <p className="text-sm mb-4">請下載檔案後使用專用軟體開啟</p>
                    <Button
                      onClick={() => window.open(previewFile.fileUrl, '_blank')}
                    >
                      下載檔案
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 批次修改人員對話框 */}
      <Dialog open={showBatchUpdateDialog} onOpenChange={setShowBatchUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次修改人員歸屬</DialogTitle>
            <DialogDescription>
              已選擇 {selectedFileIds.length} 個檔案，請選擇要指定的人員
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-employee">選擇人員</Label>
              <Select value={batchUpdateEmployee} onValueChange={setBatchUpdateEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇人員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">未指定人員</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({departments?.find(d => d.id === emp.departmentId)?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBatchUpdateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleBatchUpdate} disabled={batchUpdateMutation.isPending}>
                {batchUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確定修改
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
