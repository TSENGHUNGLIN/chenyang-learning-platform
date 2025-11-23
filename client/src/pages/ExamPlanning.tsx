import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Users, FileText, Calendar, AlertCircle, CheckCircle2, Home, Download, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useLocation } from "wouter";

export default function ExamPlanning() {
  const [, navigate] = useLocation();

  // 資料查詢
  const { data: exams, isLoading: examsLoading } = trpc.exams.list.useQuery();
  const { data: departments, isLoading: depsLoading } = trpc.departments.list.useQuery();
  const { data: employees, isLoading: employeesLoading } = trpc.employees.list.useQuery();

  // 選擇模式：single（單選）、department（按部門）、multiple（複選）
  const [selectionMode, setSelectionMode] = useState<"single" | "department" | "multiple">("single");

  // 考生選擇
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  // 考卷選擇
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);

  // 時間設定
  const [batchStartTime, setBatchStartTime] = useState<string>("");
  const [batchDeadline, setBatchDeadline] = useState<string>("");
  const [examFrequency, setExamFrequency] = useState<"daily" | "weekly" | "custom" | "none">("none");
  const [customInterval, setCustomInterval] = useState<number>(1);
  const [customIntervalUnit, setCustomIntervalUnit] = useState<"days" | "weeks">("days");

  // 每張考卷獨立時間設定
  const [individualExamTimes, setIndividualExamTimes] = useState<Record<number, { startTime: string; deadline: string }>>({});
  const [selectedExamForTime, setSelectedExamForTime] = useState<number | null>(null);
  const [useIndividualTimes, setUseIndividualTimes] = useState<boolean>(false);

  // 批次資訊
  const [batchName, setBatchName] = useState<string>("");
  const [batchDescription, setBatchDescription] = useState<string>("");

  // CSV 匯入
  const [csvContent, setCsvContent] = useState<string>("");
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  // 考卷選擇對話框
  const [showExamSelectionDialog, setShowExamSelectionDialog] = useState(false);

  // 搜尋
  const [userSearch, setUserSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");
  const [examSearchHistory, setExamSearchHistory] = useState<string[]>([]);
  const [showExamHistory, setShowExamHistory] = useState(false);

  // 從 localStorage 讀取搜尋歷史
  useEffect(() => {
    const history = localStorage.getItem("examSearchHistory");
    if (history) {
      try {
        setExamSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse exam search history", e);
      }
    }
  }, []);

  // 儲存搜尋歷史
  const saveSearchHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    const newHistory = [searchTerm, ...examSearchHistory.filter(h => h !== searchTerm)].slice(0, 5);
    setExamSearchHistory(newHistory);
    localStorage.setItem("examSearchHistory", JSON.stringify(newHistory));
  };

  // 處理搜尋輸入
  const handleExamSearchChange = (value: string) => {
    setExamSearch(value);
    if (value.trim()) {
      setShowExamHistory(false);
    }
  };

  // 選擇歷史記錄
  const handleSelectHistory = (historyItem: string) => {
    setExamSearch(historyItem);
    setShowExamHistory(false);
  };

  // API mutations
  const batchPlanMutation = trpc.examPlanning.batchPlan.useMutation({
    onSuccess: (data) => {
      toast.success(`成功規劃 ${data.totalPlanned} 項考試指派`);
      // 重置表單
      setSelectedUserIds([]);
      setSelectedExamIds([]);
      setSelectedDepartmentId(null);
      setBatchStartTime("");
      setBatchDeadline("");
      setBatchName("");
      setBatchDescription("");
    },
    onError: (error) => {
      toast.error(`規劃失敗：${error.message}`);
    },
  });

  const parseCSVMutation = trpc.examPlanning.parseCSV.useMutation({
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toast.warning(`解析完成，但有 ${data.errors.length} 個錯誤`, {
          description: data.errors.slice(0, 3).join("\n"),
        });
      } else {
        toast.success(`成功解析 ${data.parsedCount} 筆資料`);
      }

      // 自動填入規劃項目
      if (data.planningItems.length > 0) {
        const examIds = [...new Set(data.planningItems.map(item => item.examId))];
        const userIds = [...new Set(data.planningItems.map(item => item.userId))];
        setSelectedExamIds(examIds);
        setSelectedUserIds(userIds);
        setSelectionMode("multiple");
      }

      setShowCsvDialog(false);
    },
    onError: (error) => {
      toast.error(`CSV 解析失敗：${error.message}`);
    },
  });

  // 篩選考生（直接使用 employees 表）
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];

    if (userSearch) {
      return employees.filter(emp =>
        emp.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        emp.email?.toLowerCase().includes(userSearch.toLowerCase())
      );
    }

    return employees;
  }, [employees, userSearch]);

  // 按部門分組考生
  const employeesByDepartment = useMemo(() => {
    if (!filteredEmployees || !departments) return {};

    const grouped: Record<number, typeof filteredEmployees> = {};
    
    // 初始化每個部門的空陣列
    departments.forEach(dept => {
      grouped[dept.id] = [];
    });
    // 未分配部門
    grouped[0] = [];

    // 將考生分配到對應的部門
    filteredEmployees.forEach(emp => {
      const deptId = emp.departmentId || 0;
      if (grouped[deptId]) {
        grouped[deptId].push(emp);
      } else {
        grouped[0].push(emp);
      }
    });

    return grouped;
  }, [filteredEmployees, departments]);

  // 篩選考卷
  const filteredExams = useMemo(() => {
    if (!exams) return [];

    if (examSearch) {
      return exams.filter(e =>
        e.title.toLowerCase().includes(examSearch.toLowerCase())
      );
    }

    // 顯示所有已發布和草稿狀態的考卷（不顯示已封存的）
    return exams.filter(e => e.status === "published" || e.status === "draft");
  }, [exams, examSearch]);

  // 處理部門選擇
  const handleDepartmentSelect = (deptId: number) => {
    setSelectedDepartmentId(deptId);
    const deptUsers = usersByDepartment[deptId] || [];
    setSelectedUserIds(deptUsers.map(u => u.id));
  };

  // 處理考生複選
  const handleUserToggle = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 處理考卷複選
  const handleExamToggle = (examId: number) => {
    setSelectedExamIds(prev =>
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  // 全選考生
  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredEmployees.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredEmployees.map(u => u.id));
    }
  };

  // 全選考卷
  const handleSelectAllExams = () => {
    if (selectedExamIds.length === filteredExams.length) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(filteredExams.map(e => e.id));
    }
  };

  // 提交規劃
  const handleSubmit = () => {
    if (selectedUserIds.length === 0) {
      toast.error("請選擇至少一位考生");
      return;
    }

    if (selectedExamIds.length === 0) {
      toast.error("請選擇至少一份考卷");
      return;
    }

    // 建立規劃項目（笛卡爾積：每位考生 × 每份考卷）
    const planningItems = [];
    for (const userId of selectedUserIds) {
      selectedExamIds.forEach((examId, index) => {
        let startTime: string | undefined;
        let deadline: string | undefined;

        if (useIndividualTimes && individualExamTimes[examId]) {
          // 使用獨立時間設定
          startTime = individualExamTimes[examId].startTime || undefined;
          deadline = individualExamTimes[examId].deadline || undefined;
        } else {
          // 使用批次時間設定（根據頻率計算）
          if (examFrequency === "none" || selectedExamIds.length === 1) {
            startTime = batchStartTime || undefined;
          } else {
            const baseDate = batchStartTime ? new Date(batchStartTime) : new Date();
            let intervalDays = 0;
            if (examFrequency === "daily") {
              intervalDays = 1;
            } else if (examFrequency === "weekly") {
              intervalDays = 7;
            } else if (examFrequency === "custom") {
              intervalDays = customIntervalUnit === "weeks" ? customInterval * 7 : customInterval;
            }
            const examDate = new Date(baseDate);
            examDate.setDate(examDate.getDate() + (index * intervalDays));
            startTime = examDate.toISOString().slice(0, 16);
          }
          deadline = batchDeadline || undefined;
        }

        planningItems.push({
          userId,
          examId,
          startTime,
          deadline,
        });
      });
    }

    batchPlanMutation.mutate({
      planningItems,
      batchName: batchName || undefined,
      description: batchDescription || undefined,
      importSource: "manual",
    });
  };

  // 處理 CSV 上傳
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  // 提交 CSV 解析
  const handleCsvSubmit = () => {
    if (!csvContent) {
      toast.error("請先上傳 CSV 檔案");
      return;
    }

    parseCSVMutation.mutate({ csvContent });
  };

  // 下載 CSV 範本
  const handleDownloadTemplate = () => {
    const template = [
      "考生姓名,考生Email,考卷名稱,開始時間,截止時間",
      "張三,zhang@example.com,JavaScript基礎測驗,2025-02-01 09:00,2025-02-07 23:59",
      "李四,li@example.com,React進階考試,2025-02-01 09:00,2025-02-14 23:59",
      "王五,wang@example.com,TypeScript測驗,2025-02-01 09:00,2025-02-07 23:59",
    ].join("\n");

    const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "考試規劃範本.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV 範本已下載");
  };

  if (examsLoading || employeesLoading || depsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">考生規劃</h1>
          <p className="text-muted-foreground mt-2">為考生批次安排考試，支援手動選擇或 CSV 匯入</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/exam-management")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回考試管理
          </Button>
          <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              CSV 批次匯入
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>CSV 批次匯入</DialogTitle>
              <DialogDescription>
                上傳 CSV 檔案以批次規劃考試。檔案格式：考生姓名,考生Email,考卷名稱,開始時間,截止時間
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  下載 CSV 範本
                </Button>
              </div>
              <div>
                <Label htmlFor="csv-file">選擇 CSV 檔案</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="mt-2"
                />
              </div>

              {csvContent && (
                <div>
                  <Label>檔案預覽（前 5 行）</Label>
                  <Textarea
                    value={csvContent.split("\n").slice(0, 5).join("\n")}
                    readOnly
                    className="mt-2 font-mono text-sm"
                    rows={5}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCsvDialog(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleCsvSubmit}
                  disabled={!csvContent || parseCSVMutation.isPending}
                >
                  {parseCSVMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  解析並匯入
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：考生選擇 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              選擇考生
            </CardTitle>
            <CardDescription>
              已選擇 {selectedUserIds.length} 位考生
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 選擇模式 */}
            <div>
              <Label>選擇模式</Label>
              <RadioGroup value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="mode-single" />
                  <Label htmlFor="mode-single" className="font-normal cursor-pointer">單選考生</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="department" id="mode-department" />
                  <Label htmlFor="mode-department" className="font-normal cursor-pointer">按部門選擇</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="mode-multiple" />
                  <Label htmlFor="mode-multiple" className="font-normal cursor-pointer">複選考生</Label>
                </div>
              </RadioGroup>
            </div>

            {/* 按部門選擇 */}
            {selectionMode === "department" && (
              <>
                <div>
                  <Label>選擇考生（按部門分組）</Label>
                  <Select
                    value={selectedUserIds[0]?.toString() || ""}
                    onValueChange={(v) => {
                      const empId = Number(v);
                      setSelectedUserIds([empId]);
                      // 找到該考生所屬的部門
                      const emp = filteredEmployees.find(e => e.id === empId);
                      if (emp) {
                        setSelectedDepartmentId(emp.departmentId || 0);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="選擇考生" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map(dept => {
                        const deptEmps = employeesByDepartment[dept.id] || [];
                        if (deptEmps.length === 0) return null;
                        return (
                          <div key={dept.id}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {dept.name} ({deptEmps.length} 人)
                            </div>
                            {deptEmps.map(emp => (
                              <SelectItem key={emp.id} value={emp.id.toString()} className="pl-6">
                                {emp.name || "未命名"} ({emp.email})
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                      {employeesByDepartment[0]?.length > 0 && (
                        <div>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            未分配部門 ({employeesByDepartment[0].length} 人)
                          </div>
                          {employeesByDepartment[0].map(emp => (
                            <SelectItem key={emp.id} value={emp.id.toString()} className="pl-6">
                              {emp.name || "未命名"} ({emp.email})
                            </SelectItem>
                          ))}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* 單選考生：按部門分組 */}
            {selectionMode === "single" && (
              <>
                <div>
                  <Label>選擇考生（按部門分組）</Label>
                  <Select
                    value={selectedUserIds[0]?.toString() || ""}
                    onValueChange={(v) => {
                      const empId = Number(v);
                      setSelectedUserIds([empId]);
                      // 找到該考生所屬的部門
                      const emp = employees?.find(e => e.id === empId);
                      if (emp) {
                        setSelectedDepartmentId(emp.departmentId || 0);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="選擇考生" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map(dept => {
                        const deptEmps = employeesByDepartment[dept.id] || [];
                        if (deptEmps.length === 0) return null;
                        return (
                          <div key={dept.id}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {dept.name} ({deptEmps.length} 人)
                            </div>
                            {deptEmps.map(emp => (
                              <SelectItem key={emp.id} value={emp.id.toString()} className="pl-6">
                                {emp.name || "未命名"} ({emp.email})
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                      {employeesByDepartment[0]?.length > 0 && (
                        <div>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            未分配部門 ({employeesByDepartment[0].length} 人)
                          </div>
                          {employeesByDepartment[0].map(emp => (
                            <SelectItem key={emp.id} value={emp.id.toString()} className="pl-6">
                              {emp.name || "未命名"} ({emp.email})
                            </SelectItem>
                          ))}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* 複選考生：按部門分組 */}
            {selectionMode === "multiple" && (
              <>
                <div>
                  <Label htmlFor="user-search">搜尋考生</Label>
                  <Input
                    id="user-search"
                    placeholder="輸入姓名或 Email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllUsers}
                  className="w-full"
                >
                  {selectedUserIds.length === filteredEmployees.length ? "取消全選" : "全選"}
                </Button>

                {/* 按部門分組的考生列表 */}
                <div className="max-h-96 overflow-y-auto space-y-3 border rounded-md p-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      沒有找到考生
                    </p>
                  ) : (
                    <>
                      {departments?.map(dept => {
                        const deptEmps = filteredEmployees.filter(emp => emp.departmentId === dept.id);
                        if (deptEmps.length === 0) return null;
                        return (
                          <div key={dept.id} className="space-y-2">
                            <div className="px-2 py-1 text-sm font-semibold text-muted-foreground bg-accent/50 rounded">
                              {dept.name} ({deptEmps.length} 人)
                            </div>
                            {deptEmps.map(emp => (
                              <div
                                key={emp.id}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded-md ml-2"
                              >
                                <Checkbox
                                  checked={selectedUserIds.includes(emp.id)}
                                  onCheckedChange={() => handleUserToggle(emp.id)}
                                />
                                <label
                                  htmlFor={`emp-${emp.id}`}
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => handleUserToggle(emp.id)}
                                >
                                  <p className="text-sm font-medium truncate">{emp.name || "未命名"}</p>
                                  <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                                </label>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {/* 未分配部門的考生 */}
                      {(() => {
                        const unassignedEmps = filteredEmployees.filter(emp => !emp.departmentId || emp.departmentId === 0);
                        if (unassignedEmps.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <div className="px-2 py-1 text-sm font-semibold text-muted-foreground bg-accent/50 rounded">
                              未分配部門 ({unassignedEmps.length} 人)
                            </div>
                            {unassignedEmps.map(emp => (
                              <div
                                key={emp.id}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded-md ml-2"
                              >
                                <Checkbox
                                  checked={selectedUserIds.includes(emp.id)}
                                  onCheckedChange={() => handleUserToggle(emp.id)}
                                />
                                <label
                                  htmlFor={`emp-${emp.id}`}
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => handleUserToggle(emp.id)}
                                >
                                  <p className="text-sm font-medium truncate">{emp.name || "未命名"}</p>
                                  <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                                </label>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 中間：考卷選擇 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              選擇考卷
            </CardTitle>
            <CardDescription>
              已選擇 {selectedExamIds.length} 份考卷
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 搜尋考卷 */}
            <div className="space-y-2">
              <Label htmlFor="exam-search">搜尋考卷</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="exam-search"
                    placeholder="輸入考卷名稱或點擊下方按鈕選擇"
                    value={examSearch}
                    onChange={(e) => handleExamSearchChange(e.target.value)}
                    onFocus={() => setShowExamHistory(true)}
                    onBlur={() => setTimeout(() => setShowExamHistory(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && examSearch.trim()) {
                        saveSearchHistory(examSearch);
                        setShowExamHistory(false);
                      }
                    }}
                  />
                  {/* 搜尋歷史記錄 */}
                  {showExamHistory && examSearchHistory.length > 0 && !examSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        <p className="text-xs text-muted-foreground px-2 py-1">歷史記錄</p>
                        {examSearchHistory.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                            onClick={() => handleSelectHistory(item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 考卷選擇對話框觸發按鈕 */}
            <Dialog open={showExamSelectionDialog} onOpenChange={setShowExamSelectionDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  選擇考卷（已選 {selectedExamIds.length} 份）
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>選擇考卷</DialogTitle>
                  <DialogDescription>
                    已選擇 {selectedExamIds.length} 份考卷
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllExams}
                    className="w-full"
                  >
                    {selectedExamIds.length === filteredExams.length ? "取消全選" : "全選"}
                  </Button>

                  {/* 考卷列表 */}
                  <div className="space-y-2">
                    {filteredExams.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        沒有找到匹配的已發布考卷
                      </p>
                    ) : (
                      filteredExams.map(exam => (
                        <div
                          key={exam.id}
                          className="flex items-center gap-3 p-3 hover:bg-accent rounded-md border"
                        >
                          <Checkbox
                            checked={selectedExamIds.includes(exam.id)}
                            onCheckedChange={() => handleExamToggle(exam.id)}
                          />
                          <label
                            htmlFor={`exam-${exam.id}`}
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleExamToggle(exam.id)}
                          >
                            <p className="text-sm font-medium">{exam.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exam.timeLimit ? `${exam.timeLimit} 分鐘` : "不限時"} · 
                              及格分數 {exam.passingScore}
                            </p>
                          </label>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowExamSelectionDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={() => setShowExamSelectionDialog(false)}>
                      確認選擇
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 已選考卷顯示 */}
            {selectedExamIds.length > 0 && (
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">已選擇的考卷：</p>
                <div className="space-y-1">
                  {selectedExamIds.map(examId => {
                    const exam = exams?.find(e => e.id === examId);
                    if (!exam) return null;
                    return (
                      <div key={examId} className="flex items-center justify-between text-sm">
                        <span className="truncate">{exam.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExamToggle(examId)}
                          className="h-6 px-2"
                        >
                          移除
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右側：時間設定與提交 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              時間設定
            </CardTitle>
            <CardDescription>
              設定考試的開始時間和截止時間
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 批次名稱 */}
            <div>
              <Label htmlFor="batch-name">批次名稱（可選）</Label>
              <Input
                id="batch-name"
                placeholder="例如：2025年第一季新人考試"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* 時間設定模式切換 */}
            {selectedExamIds.length > 0 && (
              <div className="space-y-2">
                <Label>時間設定模式</Label>
                <RadioGroup
                  value={useIndividualTimes ? "individual" : "batch"}
                  onValueChange={(v) => setUseIndividualTimes(v === "individual")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="batch" id="time-batch" />
                    <Label htmlFor="time-batch" className="font-normal cursor-pointer">
                      批次設定（所有考卷使用相同時間）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="time-individual" />
                    <Label htmlFor="time-individual" className="font-normal cursor-pointer">
                      逐一設定（為每張考卷獨立設定時間）
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* 批次說明 */}
            <div>
              <Label htmlFor="batch-desc">批次說明（可選）</Label>
              <Textarea
                id="batch-desc"
                placeholder="說明此批次規劃的目的或備註"
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            {/* 批次時間設定 */}
            {!useIndividualTimes && (
              <>
                {/* 開始時間 */}
                <div>
                  <Label htmlFor="start-time">開始時間（可選）</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={batchStartTime}
                    onChange={(e) => setBatchStartTime(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* 截止時間 */}
                <div>
                  <Label htmlFor="deadline">截止時間（可選）</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={batchDeadline}
                    onChange={(e) => setBatchDeadline(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* 考試頻率設定 */}
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label>考試頻率設定</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      適用於多份考卷的間隔安排
                    </p>
                  </div>
                  <RadioGroup value={examFrequency} onValueChange={(v) => setExamFrequency(v as any)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="freq-none" />
                      <Label htmlFor="freq-none" className="font-normal cursor-pointer">
                        不定時考（所有考卷同時開放）
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="freq-daily" />
                      <Label htmlFor="freq-daily" className="font-normal cursor-pointer">
                        每日考（每天開放一份考卷）
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="freq-weekly" />
                      <Label htmlFor="freq-weekly" className="font-normal cursor-pointer">
                        每週考（每週開放一份考卷）
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="freq-custom" />
                      <Label htmlFor="freq-custom" className="font-normal cursor-pointer">
                        自訂間隔
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* 自訂間隔設定 */}
                  {examFrequency === "custom" && (
                    <div className="flex gap-2 items-center pl-6">
                      <Label className="text-sm">每</Label>
                      <Input
                        type="number"
                        min="1"
                        value={customInterval}
                        onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Select value={customIntervalUnit} onValueChange={(v) => setCustomIntervalUnit(v as any)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">天</SelectItem>
                          <SelectItem value="weeks">週</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label className="text-sm">開放一份</Label>
                    </div>
                  )}

                  {/* 智能建議 */}
                  {selectedExamIds.length > 1 && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        <strong>智能建議：</strong>
                        {selectedExamIds.length <= 5 && "建議使用「每日考」或「不定時考」"}
                        {selectedExamIds.length > 5 && selectedExamIds.length <= 20 && "建議使用「每週考」或每 2-3 天一份"}
                        {selectedExamIds.length > 20 && "建議使用「每週考」以避免考生負擔過重"}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 逐一設定時間 */}
            {useIndividualTimes && selectedExamIds.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <Label>選擇考卷設定時間</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    從下拉選單中選擇考卷，為其設定開始時間和截止時間
                  </p>
                </div>
                <Select
                  value={selectedExamForTime?.toString() || ""}
                  onValueChange={(v) => setSelectedExamForTime(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇考卷" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedExamIds.map(examId => {
                      const exam = exams?.find(e => e.id === examId);
                      if (!exam) return null;
                      const hasTime = individualExamTimes[examId];
                      return (
                        <SelectItem key={examId} value={examId.toString()}>
                          {exam.title} {hasTime && hasTime.startTime ? "✓" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* 為選中的考卷設定時間 */}
                {selectedExamForTime && (
                  <div className="space-y-3 p-3 border rounded-md bg-accent/20">
                    <p className="text-sm font-medium">
                      {exams?.find(e => e.id === selectedExamForTime)?.title}
                    </p>
                    <div>
                      <Label htmlFor="individual-start">開始時間</Label>
                      <Input
                        id="individual-start"
                        type="datetime-local"
                        value={individualExamTimes[selectedExamForTime]?.startTime || ""}
                        onChange={(e) => {
                          setIndividualExamTimes(prev => ({
                            ...prev,
                            [selectedExamForTime]: {
                              ...prev[selectedExamForTime],
                              startTime: e.target.value,
                              deadline: prev[selectedExamForTime]?.deadline || "",
                            },
                          }));
                        }}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="individual-deadline">截止時間</Label>
                      <Input
                        id="individual-deadline"
                        type="datetime-local"
                        value={individualExamTimes[selectedExamForTime]?.deadline || ""}
                        onChange={(e) => {
                          setIndividualExamTimes(prev => ({
                            ...prev,
                            [selectedExamForTime]: {
                              startTime: prev[selectedExamForTime]?.startTime || "",
                              deadline: e.target.value,
                            },
                          }));
                        }}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}

                {/* 已設定時間的考卷清單 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">已設定時間的考卷：</p>
                  {selectedExamIds.filter(id => individualExamTimes[id]?.startTime).length === 0 ? (
                    <p className="text-xs text-muted-foreground">尚未設定任何考卷的時間</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {selectedExamIds.map(examId => {
                        const exam = exams?.find(e => e.id === examId);
                        const times = individualExamTimes[examId];
                        if (!times?.startTime) return null;
                        return (
                          <div key={examId} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                            <span className="truncate flex-1">{exam?.title}</span>
                            <span className="text-muted-foreground ml-2">
                              {times.startTime ? new Date(times.startTime).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 規劃摘要 */}
            <div className="bg-muted p-4 rounded-md space-y-2">
              <h4 className="font-medium text-sm">規劃摘要</h4>
              <div className="text-sm space-y-1">
                <p>考生數量：<span className="font-medium">{selectedUserIds.length}</span></p>
                <p>考卷數量：<span className="font-medium">{selectedExamIds.length}</span></p>
                <p>總指派數：<span className="font-medium">{selectedUserIds.length * selectedExamIds.length}</span></p>
              </div>
            </div>

            {/* 提交按鈕 */}
            <Button
              onClick={handleSubmit}
              disabled={batchPlanMutation.isPending || selectedUserIds.length === 0 || selectedExamIds.length === 0}
              className="w-full"
            >
              {batchPlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  規劃中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  確認規劃
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

