import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Users, FileText, Calendar, AlertCircle, CheckCircle2, Home, Download, ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useLocation } from "wouter";

export default function ExamPlanning() {
  const [, navigate] = useLocation();

  // 考卷預覽對話框狀態（必須在 useQuery 之前定義）
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewExamId, setPreviewExamId] = useState<number | null>(null);

  // 資料查詢
  const { data: exams, isLoading: examsLoading } = trpc.exams.list.useQuery();
  const { data: departments, isLoading: depsLoading } = trpc.departments.list.useQuery();
  const { data: employees, isLoading: employeesLoading } = trpc.employees.list.useQuery();
  const { data: batches, isLoading: batchesLoading } = trpc.examPlanning.listBatches.useQuery({ limit: 50 });
  
  // 考卷預覽查詢
  const { data: previewData, isLoading: previewLoading } = trpc.exams.getPreview.useQuery(
    previewExamId!,
    { enabled: !!previewExamId && showPreviewDialog }
  );

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
  const [openBatchCombobox, setOpenBatchCombobox] = useState(false);

  // CSV 匯入
  const [csvContent, setCsvContent] = useState<string>("");
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  // 考卷選擇對話框
  const [showExamSelectionDialog, setShowExamSelectionDialog] = useState(false);
  const [tempSelectedExamIds, setTempSelectedExamIds] = useState<number[]>([]);

  // 複製時間對話框
  const [showCopyTimeDialog, setShowCopyTimeDialog] = useState(false);
  const [copyTimeTargetExamIds, setCopyTimeTargetExamIds] = useState<number[]>([]);
  const [copyTimeOffset, setCopyTimeOffset] = useState<number>(0);
  const [copyTimeOffsetUnit, setCopyTimeOffsetUnit] = useState<"days" | "weeks">("days");

  // 時間衝突檢查
  const [timeConflicts, setTimeConflicts] = useState<Array<{ examId: number; conflictWith: number[]; }>>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 當開啟預覽對話框或更換考卷時，重置頁碼
  useEffect(() => {
    if (showPreviewDialog) {
      setCurrentPage(1);
    }
  }, [showPreviewDialog, previewExamId]);

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

    // 最終衝突檢查
    if (useIndividualTimes && timeConflicts.length > 0 && showConflictWarning) {
      toast.warning("檢測到時間衝突，請確認是否繼續提交", {
        description: "如果您已確認衝突並選擇忽略，請再次點擊「確認規劃」按鈕。",
        duration: 5000,
      });
      setShowConflictWarning(false); // 下次提交時不再警告
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

  // 檢查時間衝突
  const checkTimeConflicts = useCallback(() => {
    if (!useIndividualTimes || selectedExamIds.length < 2) {
      setTimeConflicts([]);
      setShowConflictWarning(false);
      return;
    }

    const conflicts: Array<{ examId: number; conflictWith: number[]; }> = [];

    // 檢查每張考卷的時間是否與其他考卷重疊
    selectedExamIds.forEach((examId, index) => {
      const time1 = individualExamTimes[examId];
      if (!time1?.startTime || !time1?.deadline) return;

      const start1 = new Date(time1.startTime).getTime();
      const end1 = new Date(time1.deadline).getTime();

      const conflictWith: number[] = [];

      selectedExamIds.forEach((otherExamId, otherIndex) => {
        if (index >= otherIndex) return; // 避免重複檢查

        const time2 = individualExamTimes[otherExamId];
        if (!time2?.startTime || !time2?.deadline) return;

        const start2 = new Date(time2.startTime).getTime();
        const end2 = new Date(time2.deadline).getTime();

        // 檢查時間區間是否重疊
        if ((start1 <= end2 && end1 >= start2)) {
          conflictWith.push(otherExamId);
        }
      });

      if (conflictWith.length > 0) {
        conflicts.push({ examId, conflictWith });
      }
    });

    setTimeConflicts(conflicts);
    setShowConflictWarning(conflicts.length > 0);
  }, [useIndividualTimes, selectedExamIds, individualExamTimes]);

  // 當時間設定變更時，自動檢查衝突
  useEffect(() => {
    checkTimeConflicts();
  }, [checkTimeConflicts]);

  // 處理預覽考卷
  const handlePreviewExam = (examId: number) => {
    setPreviewExamId(examId);
    setShowPreviewDialog(true);
  };

  // 複製時間到其他考卷
  const handleCopyTime = () => {
    if (!selectedExamForTime || !individualExamTimes[selectedExamForTime]) {
      toast.error("無法複製：未找到原始時間設定");
      return;
    }

    if (copyTimeTargetExamIds.length === 0) {
      toast.error("請選擇至少一張目標考卷");
      return;
    }

    const sourceTime = individualExamTimes[selectedExamForTime];
    const offsetMs = copyTimeOffsetUnit === "weeks" 
      ? copyTimeOffset * 7 * 24 * 60 * 60 * 1000 
      : copyTimeOffset * 24 * 60 * 60 * 1000;

    // 複製時間到目標考卷
    const newTimes = { ...individualExamTimes };
    copyTimeTargetExamIds.forEach(examId => {
      const newStartTime = sourceTime.startTime 
        ? new Date(new Date(sourceTime.startTime).getTime() + offsetMs).toISOString().slice(0, 16)
        : "";
      const newDeadline = sourceTime.deadline
        ? new Date(new Date(sourceTime.deadline).getTime() + offsetMs).toISOString().slice(0, 16)
        : "";

      newTimes[examId] = {
        startTime: newStartTime,
        deadline: newDeadline,
      };
    });

    setIndividualExamTimes(newTimes);
    toast.success(`已將時間設定複製到 ${copyTimeTargetExamIds.length} 張考卷`);
    
    // 關閉對話框並重置狀態
    setShowCopyTimeDialog(false);
    setCopyTimeTargetExamIds([]);
    setCopyTimeOffset(0);
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
                  onClick={() => {
                    // 開啟對話框時，將當前選擇複製到暫存狀態
                    setTempSelectedExamIds([...selectedExamIds]);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  選擇考卷（已選 {selectedExamIds.length} 份）
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>選擇考卷</DialogTitle>
                  <DialogDescription>
                    已選擇 {tempSelectedExamIds.length} 份考卷
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (tempSelectedExamIds.length === filteredExams.length) {
                        setTempSelectedExamIds([]);
                      } else {
                        setTempSelectedExamIds(filteredExams.map(e => e.id));
                      }
                    }}
                    className="w-full"
                  >
                    {tempSelectedExamIds.length === filteredExams.length ? "取消全選" : "全選"}
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
                            checked={tempSelectedExamIds.includes(exam.id)}
                            onCheckedChange={() => {
                              setTempSelectedExamIds(prev => {
                                if (prev.includes(exam.id)) {
                                  return prev.filter(id => id !== exam.id);
                                } else {
                                  return [...prev, exam.id];
                                }
                              });
                            }}
                          />
                          <label
                            htmlFor={`exam-${exam.id}`}
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setTempSelectedExamIds(prev => {
                                if (prev.includes(exam.id)) {
                                  return prev.filter(id => id !== exam.id);
                                } else {
                                  return [...prev, exam.id];
                                }
                              });
                            }}
                          >
                            <p className="text-sm font-medium">{exam.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exam.timeLimit ? `${exam.timeLimit} 分鐘` : "不限時"} · 
                              及格分數 {exam.passingScore}
                            </p>
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewExam(exam.id);
                            }}
                            className="h-8 px-3 flex-shrink-0"
                          >
                            預覽
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // 取消時不套用暫存選擇，直接關閉對話框
                        setShowExamSelectionDialog(false);
                        setTempSelectedExamIds([]);
                      }}
                    >
                      取消
                    </Button>
                    <Button 
                      onClick={() => {
                        // 確定時才套用暫存選擇到實際狀態
                        setSelectedExamIds([...tempSelectedExamIds]);
                        setShowExamSelectionDialog(false);
                        toast.success(`已選擇 ${tempSelectedExamIds.length} 份考卷`);
                      }}
                    >
                      確定
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
            {/* 考卷選擇 */}
            <div>
              <Label htmlFor="exam-selection">考卷選擇</Label>
              <CardDescription className="mt-1 mb-2">
                已選擇 {selectedExamIds.length} 份考卷
              </CardDescription>
              {selectedExamIds.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/20">請先從中間區域選擇考卷</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/20">
                  {selectedExamIds.map((examId) => {
                    const exam = exams?.find((e) => e.id === examId);
                    if (!exam) return null;
                    return (
                      <div key={examId} className="flex items-center justify-between p-2 bg-background rounded-md border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{exam.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {exam.description || "無描述"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExamToggle(examId)}
                          className="h-8 px-2 ml-2 shrink-0"
                        >
                          移除
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 批次名稱 */}
            <div>
              <Label htmlFor="batch-name">批次名稱（可選）</Label>
              <Popover open={openBatchCombobox} onOpenChange={setOpenBatchCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBatchCombobox}
                    className="w-full justify-between mt-2"
                  >
                    {batchName || "選擇或輸入批次名稱..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="搜尋或輸入批次名稱..." 
                      value={batchName}
                      onValueChange={setBatchName}
                    />
                    <CommandEmpty>輸入新的批次名稱</CommandEmpty>
                    <CommandGroup>
                      {batches?.map((batch) => (
                        <CommandItem
                          key={batch.id}
                          value={batch.batchName}
                          onSelect={(currentValue) => {
                            setBatchName(currentValue === batchName ? "" : currentValue);
                            setOpenBatchCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              batchName === batch.batchName ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {batch.batchName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* 時間設定模式切換 */}
            <div className="space-y-2">
              <Label>時間設定模式</Label>
              {selectedExamIds.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">請先選擇考卷</p>
              ) : (
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
              )}
            </div>

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
                    {/* 操作按鈕 */}
                    <div className="flex gap-2">
                      {individualExamTimes[selectedExamForTime]?.startTime && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCopyTimeDialog(true)}
                          className="flex-1"
                        >
                          複製到其他考卷
                        </Button>
                      )}
                      {(individualExamTimes[selectedExamForTime]?.startTime || individualExamTimes[selectedExamForTime]?.deadline) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setIndividualExamTimes(prev => {
                              const newTimes = { ...prev };
                              delete newTimes[selectedExamForTime];
                              return newTimes;
                            });
                            toast.success("已清除時間設定");
                          }}
                          className="flex-1"
                        >
                          清除時間
                        </Button>
                      )}
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
                          <div key={examId} className="flex items-center justify-between p-2 bg-accent/30 rounded hover:bg-accent/50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{exam?.title}</p>
                              <p className="text-muted-foreground">
                                {times.startTime ? new Date(times.startTime).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                {times.deadline && " ~ " + new Date(times.deadline).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedExamForTime(examId)}
                                className="h-7 px-2"
                              >
                                編輯
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setIndividualExamTimes(prev => {
                                    const newTimes = { ...prev };
                                    delete newTimes[examId];
                                    return newTimes;
                                  });
                                  toast.success("已清除時間設定");
                                }}
                                className="h-7 px-2 text-destructive hover:text-destructive"
                              >
                                清除
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 時間衝突警告 */}
                {showConflictWarning && timeConflicts.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          檢測到時間衝突
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          以下考卷的時間區間有重疊，可能導致考生負擔過重：
                        </p>
                        <div className="mt-2 space-y-1">
                          {timeConflicts.map(conflict => {
                            const exam = exams?.find(e => e.id === conflict.examId);
                            const conflictExams = conflict.conflictWith.map(id => exams?.find(e => e.id === id)?.title).filter(Boolean);
                            return (
                              <div key={conflict.examId} className="text-xs text-yellow-700 dark:text-yellow-300">
                                • <strong>{exam?.title}</strong> 與 {conflictExams.join("、")} 時間重疊
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConflictWarning(false)}
                            className="text-xs h-7"
                          >
                            忽略警告
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

      {/* 複製時間對話框 */}
      <Dialog open={showCopyTimeDialog} onOpenChange={setShowCopyTimeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>複製時間到其他考卷</DialogTitle>
            <DialogDescription>
              將「{exams?.find(e => e.id === selectedExamForTime)?.title}」的時間設定複製到其他考卷
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 原始時間顯示 */}
            {selectedExamForTime && individualExamTimes[selectedExamForTime] && (
              <div className="bg-accent/20 p-3 rounded-md space-y-2">
                <p className="text-sm font-medium">原始時間設定：</p>
                <div className="text-sm space-y-1">
                  <p>開始時間：{individualExamTimes[selectedExamForTime].startTime ? new Date(individualExamTimes[selectedExamForTime].startTime).toLocaleString("zh-TW") : "未設定"}</p>
                  <p>截止時間：{individualExamTimes[selectedExamForTime].deadline ? new Date(individualExamTimes[selectedExamForTime].deadline).toLocaleString("zh-TW") : "未設定"}</p>
                </div>
              </div>
            )}

            {/* 微調選項 */}
            <div className="space-y-2">
              <Label>時間微調（可選）</Label>
              <div className="flex gap-2 items-center">
                <Label className="text-sm">自動延後</Label>
                <Input
                  type="number"
                  min="0"
                  value={copyTimeOffset}
                  onChange={(e) => setCopyTimeOffset(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <Select value={copyTimeOffsetUnit} onValueChange={(v) => setCopyTimeOffsetUnit(v as any)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">天</SelectItem>
                    <SelectItem value="weeks">週</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                設定後，目標考卷的時間將自動往後延遲指定的天數或週數
              </p>
            </div>

            {/* 目標考卷選擇 */}
            <div className="space-y-2">
              <Label>選擇目標考卷（可複選）</Label>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3">
                {selectedExamIds
                  .filter(id => id !== selectedExamForTime)
                  .map(examId => {
                    const exam = exams?.find(e => e.id === examId);
                    if (!exam) return null;
                    const isSelected = copyTimeTargetExamIds.includes(examId);
                    return (
                      <div key={examId} className="flex items-center space-x-2">
                        <Checkbox
                          id={`copy-target-${examId}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCopyTimeTargetExamIds(prev => [...prev, examId]);
                            } else {
                              setCopyTimeTargetExamIds(prev => prev.filter(id => id !== examId));
                            }
                          }}
                        />
                        <Label htmlFor={`copy-target-${examId}`} className="font-normal cursor-pointer flex-1">
                          {exam.title}
                          {individualExamTimes[examId]?.startTime && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (已設定時間，將被覆蓋)
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 按鈕區 */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCopyTimeDialog(false);
                  setCopyTimeTargetExamIds([]);
                  setCopyTimeOffset(0);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCopyTime}
                disabled={copyTimeTargetExamIds.length === 0}
              >
                確認複製
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 考卷預覽對話框 */}
      <Dialog open={showPreviewDialog} onOpenChange={(open) => {
        setShowPreviewDialog(open);
        if (!open) setPreviewExamId(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>考卷預覽</DialogTitle>
            <DialogDescription>
              查看考卷詳細資訊和題目清單
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewData ? (
            <div className="space-y-6">
              {/* 考卷基本資訊 */}
              <div className="bg-accent/20 p-4 rounded-md space-y-3">
                <h3 className="text-lg font-semibold">{previewData.exam.title}</h3>
                {previewData.exam.description && (
                  <p className="text-sm text-muted-foreground">{previewData.exam.description}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">狀態</p>
                    <p className="font-medium">
                      {previewData.exam.status === "published" ? "已發布" : 
                       previewData.exam.status === "draft" ? "草稿" : "已封存"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">時間限制</p>
                    <p className="font-medium">
                      {previewData.exam.timeLimit ? `${previewData.exam.timeLimit} 分鐘` : "不限時"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">及格分數</p>
                    <p className="font-medium">{previewData.exam.passingScore} 分</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">總分</p>
                    <p className="font-medium">{previewData.exam.totalScore || 100} 分</p>
                  </div>
                </div>
              </div>

              {/* 題目統計 */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
                <h4 className="font-medium text-sm mb-3">題目統計</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">總題數</p>
                    <p className="font-medium text-lg">{previewData.stats.totalQuestions} 題</p>
                  </div>
                  {previewData.stats.multipleChoice > 0 && (
                    <div>
                      <p className="text-muted-foreground">選擇題</p>
                      <p className="font-medium">{previewData.stats.multipleChoice} 題</p>
                    </div>
                  )}
                  {previewData.stats.trueFalse > 0 && (
                    <div>
                      <p className="text-muted-foreground">是非題</p>
                      <p className="font-medium">{previewData.stats.trueFalse} 題</p>
                    </div>
                  )}
                  {previewData.stats.shortAnswer > 0 && (
                    <div>
                      <p className="text-muted-foreground">簡答題</p>
                      <p className="font-medium">{previewData.stats.shortAnswer} 題</p>
                    </div>
                  )}
                  {previewData.stats.essay > 0 && (
                    <div>
                      <p className="text-muted-foreground">申論題</p>
                      <p className="font-medium">{previewData.stats.essay} 題</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 題目清單 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">題目清單</h4>
                  {previewData.questions.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      共 {previewData.questions.length} 題
                    </p>
                  )}
                </div>
                {previewData.questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    此考卷尚未加入題目
                  </p>
                ) : (
                  <>
                    {/* 分頁導航 - 頁首 */}
                    {previewData.questions.length > itemsPerPage && (
                      <div className="flex items-center justify-between gap-2 py-2 border-b">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          上一頁
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          第 {currentPage} / {Math.ceil(previewData.questions.length / itemsPerPage)} 頁
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(previewData.questions.length / itemsPerPage), p + 1))}
                          disabled={currentPage === Math.ceil(previewData.questions.length / itemsPerPage)}
                        >
                          下一頁
                        </Button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {previewData.questions
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((q, index) => (
                      <div key={q.id} className="border rounded-md p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">
                            {(currentPage - 1) * itemsPerPage + index + 1}. {q.content}
                          </p>
                          <span className="text-xs bg-accent px-2 py-1 rounded flex-shrink-0">
                            {q.type === "multiple_choice" ? "選擇" :
                             q.type === "true_false" ? "是非" :
                             q.type === "short_answer" ? "簡答" : "申論"}
                          </span>
                        </div>
                        {q.type === "multiple_choice" && q.options && (
                          <div className="pl-4 space-y-1 text-xs text-muted-foreground">
                            {(() => {
                              try {
                                const options = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
                                const optionsArray = Array.isArray(options) ? options : [];
                                return optionsArray.map((opt: any, idx: number) => (
                                  <p key={idx}>
                                    {String.fromCharCode(65 + idx)}. {typeof opt === "string" ? opt : opt.label || opt.value || ""}
                                  </p>
                                ));
                              } catch (e) {
                                return <p className="text-red-500">選項格式錯誤</p>;
                              }
                            })()}
                          </div>
                        )}
                        {q.difficulty && (
                          <p className="text-xs text-muted-foreground">
                            難度：{q.difficulty === "easy" ? "簡單" : q.difficulty === "medium" ? "中等" : "困難"}
                          </p>
                        )}
                      </div>
                      ))}
                    </div>

                    {/* 分頁導航 - 頁尾（可選） */}
                    {previewData.questions.length > itemsPerPage && (
                      <div className="flex items-center justify-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          上一頁
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          第 {currentPage} / {Math.ceil(previewData.questions.length / itemsPerPage)} 頁
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(previewData.questions.length / itemsPerPage), p + 1))}
                          disabled={currentPage === Math.ceil(previewData.questions.length / itemsPerPage)}
                        >
                          下一頁
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 按鈕區 */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setShowPreviewDialog(false)}>
                  關閉
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              無法載入考卷資訊
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

