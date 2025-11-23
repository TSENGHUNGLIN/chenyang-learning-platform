import { useState, useMemo } from "react";
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
import { Loader2, Upload, Users, FileText, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function ExamPlanning() {
  // 資料查詢
  const { data: exams, isLoading: examsLoading } = trpc.exams.list.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: departments, isLoading: depsLoading } = trpc.departments.list.useQuery();

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

  // 批次資訊
  const [batchName, setBatchName] = useState<string>("");
  const [batchDescription, setBatchDescription] = useState<string>("");

  // CSV 匯入
  const [csvContent, setCsvContent] = useState<string>("");
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  // 搜尋
  const [userSearch, setUserSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");

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

  // 篩選考生（根據部門和搜尋）
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users.filter(u => u.role === "examinee");

    if (userSearch) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
      );
    }

    return filtered;
  }, [users, userSearch]);

  // 按部門分組考生
  const usersByDepartment = useMemo(() => {
    if (!filteredUsers || !departments) return {};

    const grouped: Record<number, typeof filteredUsers> = {};
    
    departments.forEach(dept => {
      grouped[dept.id] = [];
    });

    // 注意：這裡假設 users 表格沒有 departmentId，需要透過 employees 表格關聯
    // 暫時先顯示所有考生在「未分配部門」
    grouped[0] = filteredUsers;

    return grouped;
  }, [filteredUsers, departments]);

  // 篩選考卷
  const filteredExams = useMemo(() => {
    if (!exams) return [];

    if (examSearch) {
      return exams.filter(e =>
        e.title.toLowerCase().includes(examSearch.toLowerCase())
      );
    }

    return exams.filter(e => e.status === "published");
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
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
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
      for (const examId of selectedExamIds) {
        planningItems.push({
          userId,
          examId,
          startTime: batchStartTime || undefined,
          deadline: batchDeadline || undefined,
        });
      }
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

  if (examsLoading || usersLoading || depsLoading) {
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
          <h1 className="text-3xl font-bold">考生考試規劃</h1>
          <p className="text-muted-foreground mt-2">為考生批次安排考試，支援手動選擇或 CSV 匯入</p>
        </div>

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
              <div>
                <Label>選擇部門</Label>
                <Select
                  value={selectedDepartmentId?.toString()}
                  onValueChange={(v) => handleDepartmentSelect(Number(v))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="選擇部門" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 搜尋考生 */}
            {(selectionMode === "single" || selectionMode === "multiple") && (
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

                {selectionMode === "multiple" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllUsers}
                    className="w-full"
                  >
                    {selectedUserIds.length === filteredUsers.length ? "取消全選" : "全選"}
                  </Button>
                )}

                {/* 考生列表 */}
                {selectionMode === "single" ? (
                  <RadioGroup
                    value={selectedUserIds[0]?.toString() || ""}
                    onValueChange={(value) => setSelectedUserIds([parseInt(value)])}
                  >
                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-2">
                      {filteredUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          沒有找到考生
                        </p>
                      ) : (
                        filteredUsers.map(user => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => setSelectedUserIds([user.id])}
                          >
                            <RadioGroupItem
                              value={user.id.toString()}
                              id={`user-${user.id}`}
                            />
                            <Label htmlFor={`user-${user.id}`} className="flex-1 min-w-0 cursor-pointer">
                              <p className="text-sm font-medium truncate">{user.name || "未命名"}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-2">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        沒有找到考生
                      </p>
                    ) : (
                      filteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => handleUserToggle(user.id)}
                        >
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => handleUserToggle(user.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name || "未命名"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
            <div>
              <Label htmlFor="exam-search">搜尋考卷</Label>
              <Input
                id="exam-search"
                placeholder="輸入考卷名稱"
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="mt-2"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllExams}
              className="w-full"
            >
              {selectedExamIds.length === filteredExams.length ? "取消全選" : "全選"}
            </Button>

            {/* 考卷列表 */}
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-2">
              {filteredExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  沒有找到已發布的考卷
                </p>
              ) : (
                filteredExams.map(exam => (
                  <div
                    key={exam.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => handleExamToggle(exam.id)}
                  >
                    <Checkbox
                      checked={selectedExamIds.includes(exam.id)}
                      onCheckedChange={() => handleExamToggle(exam.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exam.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {exam.timeLimit ? `${exam.timeLimit} 分鐘` : "不限時"} · 
                        及格分數 {exam.passingScore}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
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

