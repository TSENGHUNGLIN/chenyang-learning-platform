import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Eye, Edit, Trash2, FileText, Calendar, Clock, Users, BarChart3, TrendingUp, FileEdit, Zap, CheckSquare, Archive } from "lucide-react";
import CreateExamWizard from "@/components/CreateExamWizard";
import ExamPreviewDialog from "@/components/ExamPreviewDialog";
import ExamDeletionImpactDialog from "@/components/ExamDeletionImpactDialog";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ExamList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepartments, setExpandedDepartments] = useState<Set<number>>(new Set());
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewExamId, setPreviewExamId] = useState<number>(0);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImpactDialog, setShowImpactDialog] = useState(false);
  const [examToDelete, setExamToDelete] = useState<any | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // 表單狀態
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    timeLimit: 60,
    passingScore: 60,
    totalScore: 100,
  });

  // 查詢考試列表
  const { data: exams, isLoading, refetch } = trpc.exams.list.useQuery();
  
  // 查詢可訪問的使用者（編輯者只能看到負責的考生）
  const { data: accessibleUsersData } = trpc.users.accessibleUsers.useQuery(
    undefined,
    { enabled: user?.role === "editor" }
  );
  const { data: allUsersData } = trpc.users.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );
  
  // 根據角色選擇使用者列表
  const users = user?.role === "editor" ? accessibleUsersData : allUsersData;
  
  // 查詢部門和員工資料（用於按部門分組）
  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  
  // 按部門分組員工
  const employeesByDepartment = useMemo(() => {
    if (!employees || !departments) return {};
    
    const grouped: Record<number, typeof employees> = {};
    
    // 初始化每個部門的空陣列
    departments.forEach(dept => {
      grouped[dept.id] = [];
    });
    // 未分配部門
    grouped[0] = [];
    
    // 將員工分配到對應的部門
    employees.forEach(emp => {
      const deptId = emp.departmentId || 0;
      if (grouped[deptId]) {
        grouped[deptId].push(emp);
      } else {
        grouped[0].push(emp);
      }
    });
    
    return grouped;
  }, [employees, departments]);
  
  // 篩選員工（根據搜尋）
  const filteredEmployeesByDepartment = useMemo(() => {
    if (!searchQuery) return employeesByDepartment;
    
    const filtered: Record<number, typeof employees> = {};
    
    Object.entries(employeesByDepartment).forEach(([deptId, emps]) => {
      const filteredEmps = (emps || []).filter(emp =>
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filteredEmps.length > 0) {
        filtered[Number(deptId)] = filteredEmps;
      }
    });
    
    return filtered;
  }, [employeesByDepartment, searchQuery]);
  
  // 切換部門展開/收合
  const toggleDepartment = (deptId: number) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };
  
  // 全選/取消全選部門員工
  const toggleSelectAllInDepartment = (deptId: number) => {
    const deptEmployees = filteredEmployeesByDepartment[deptId] || [];
    const deptEmployeeIds = deptEmployees.map(e => e.id);
    const allSelected = deptEmployeeIds.every(id => selectedUserIds.includes(id));
    
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !deptEmployeeIds.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...deptEmployeeIds])]);
    }
  };
  
  // 建立考試
  const createExamMutation = trpc.exams.create.useMutation({
    onSuccess: () => {
      toast.success("考試已建立");
      setShowCreateWizard(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`建立失敗：${error.message}`);
    },
  });
  
  // 更新考試
  const updateExamMutation = trpc.exams.update.useMutation({
    onSuccess: () => {
      toast.success("考試已更新");
      setShowEditDialog(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });
  
  // 軟刪除考試
  const softDeleteMutation = trpc.exams.softDelete.useMutation({
    onSuccess: () => {
      toast.success("考試已移至回收站");
      setSelectedExamId(null);
      setSelectedExamIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });
  
  // 批次軟刪除考試
  const batchSoftDeleteMutation = trpc.exams.batchSoftDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`已成功刪除 ${data.success} 個考試，失敗 ${data.failed} 個`);
      setSelectedExamId(null);
      setSelectedExamIds([]);
      setIsBatchMode(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`批次刪除失敗：${error.message}`);
    },
  });
  
  // 批次指派考試
  const batchAssignMutation = trpc.exams.batchAssign.useMutation({
    onSuccess: (data) => {
      toast.success(`已成功指派 ${data.count} 位考生`);
      setShowAssignDialog(false);
      setSelectedUserIds([]);
      setSearchQuery("");
      refetch();
    },
    onError: (error) => {
      toast.error(`指派失敗：${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      timeLimit: 60,
      passingScore: 60,
      totalScore: 100,
    });
    setSelectedExam(null);
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error("請輸入考試名稱");
      return;
    }
    
    createExamMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      timeLimit: formData.timeLimit,
      passingScore: formData.passingScore,
      totalScore: formData.totalScore,
      gradingMethod: "auto",
      status: "draft",
    });
  };

  const handleEdit = (exam: any) => {
    setSelectedExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description || "",
      timeLimit: exam.timeLimit || 60,
      passingScore: exam.passingScore,
      totalScore: exam.totalScore || 100,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedExam) return;
    
    if (!formData.title.trim()) {
      toast.error("請輸入考試名稱");
      return;
    }
    
    updateExamMutation.mutate({
      id: selectedExam.id,
      title: formData.title,
      description: formData.description || undefined,
      timeLimit: formData.timeLimit,
      passingScore: formData.passingScore,
      totalScore: formData.totalScore,
    });
  };

  const handleDelete = (exam: any) => {
    setShowImpactDialog(true);
  };
  
  const handleBatchDelete = () => {
    if (selectedExamIds.length === 0) {
      toast.error("請至少選擇一個考試");
      return;
    }
    setShowImpactDialog(true);
  };
  
  const confirmDelete = () => {
    if (isBatchMode) {
      batchSoftDeleteMutation.mutate(selectedExamIds);
    } else if (selectedExamId) {
      softDeleteMutation.mutate(selectedExamId);
    }
  };
  
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedExamIds([]);
  };
  
  const toggleExamSelection = (examId: number) => {
    setSelectedExamIds(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };
  
  const toggleSelectAllExams = () => {
    if (!exams) return;
    if (selectedExamIds.length === exams.length) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(exams.map(e => e.id));
    }
  };
  
  const handleAssign = (exam: any) => {
    setSelectedExam(exam);
    setShowAssignDialog(true);
    // 預設展開所有部門
    if (departments) {
      const allDeptIds = departments.map(d => d.id);
      allDeptIds.push(0); // 加入未分配部門
      setExpandedDepartments(new Set(allDeptIds));
    }
  };
  
  const handleBatchAssign = () => {
    if (!selectedExam) return;
    if (selectedUserIds.length === 0) {
      toast.error("請至少選擇一位考生");
      return;
    }
    
    batchAssignMutation.mutate({
      examId: selectedExam.id,
      userIds: selectedUserIds,
    });
  };
  
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };
  
  const toggleSelectAll = () => {
    if (!users) return;
    const filteredUsers = users.filter(u => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  // 計算考試狀態（草稿/已發布/進行中/已結束）
  const getExamStatus = (exam: any) => {
    if (exam.status === 'draft') {
      return { text: '草稿', variant: 'secondary' as const, key: 'draft' };
    }
    if (exam.status === 'archived') {
      return { text: '已封存', variant: 'outline' as const, key: 'archived' };
    }
    
    // 已發布的考試，需要根據時間判斷狀態
    const now = new Date();
    const startTime = exam.startTime ? new Date(exam.startTime) : null;
    const endTime = exam.endTime ? new Date(exam.endTime) : null;
    
    if (startTime && endTime) {
      if (now < startTime) {
        return { text: '已發布', variant: 'default' as const, key: 'published' };
      } else if (now >= startTime && now <= endTime) {
        return { text: '進行中', variant: 'default' as const, key: 'ongoing' };
      } else {
        return { text: '已結束', variant: 'outline' as const, key: 'ended' };
      }
    }
    
    // 如果沒有設定時間，則顯示已發布
    return { text: '已發布', variant: 'default' as const, key: 'published' };
  };
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { text: "草稿", variant: "secondary" },
      published: { text: "已發布", variant: "default" },
      archived: { text: "已封存", variant: "outline" },
    };
    return labels[status] || { text: status, variant: "secondary" };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="container max-w-7xl">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/exams")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回考試管理
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">考試列表</h1>
              <p className="text-muted-foreground mt-1">管理所有考卷，包括草稿、已發布和封存的考試</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={isBatchMode ? "default" : "outline"}
              onClick={toggleBatchMode}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {isBatchMode ? "取消批次模式" : "批次模式"}
            </Button>
            {isBatchMode && selectedExamIds.length > 0 && (
              <Button 
                variant="destructive"
                onClick={handleBatchDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                刪除已選 ({selectedExamIds.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setLocation("/exam-recycle-bin")}>
              <Archive className="h-4 w-4 mr-2" />
              回收站
            </Button>
            <Button variant="outline" onClick={() => setLocation("/exam-planning")}>
              <Users className="h-4 w-4 mr-2" />
              考生規劃
            </Button>
            <Button onClick={() => setShowCreateWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              建立考試
            </Button>
          </div>
        </div>

        {/* 考試列表 */}
        {!exams || exams.length === 0 ? (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">尚無考試</p>
              <p className="text-sm text-muted-foreground mt-2">點擊「建立考試」開始建立第一個考試</p>
              <Button
                className="mt-6"
                onClick={() => setShowCreateWizard(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                建立考試
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-100">考試列表</CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">共 {exams.length} 個考試</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      {isBatchMode ? (
                        <input
                          type="checkbox"
                          checked={exams.length > 0 && selectedExamIds.length === exams.length}
                          onChange={toggleSelectAllExams}
                          className="h-4 w-4 cursor-pointer"
                        />
                      ) : (
                        "選擇"
                      )}
                    </TableHead>
                    <TableHead>考試名稱</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>時長</TableHead>
                    <TableHead>及格分數</TableHead>
                    <TableHead>題目數量</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam: any) => {
                    const statusInfo = getExamStatus(exam);
                    const isSelected = isBatchMode 
                      ? selectedExamIds.includes(exam.id)
                      : selectedExamId === exam.id;
                    return (
                      <TableRow 
                        key={exam.id}
                        className={isSelected ? "bg-blue-50 dark:bg-blue-950" : ""}
                      >
                        <TableCell>
                          {isBatchMode ? (
                            <input
                              type="checkbox"
                              checked={selectedExamIds.includes(exam.id)}
                              onChange={() => toggleExamSelection(exam.id)}
                              className="h-4 w-4 cursor-pointer"
                            />
                          ) : (
                            <input
                              type="radio"
                              name="exam-selection"
                              checked={isSelected}
                              onChange={() => setSelectedExamId(exam.id)}
                              className="h-4 w-4 cursor-pointer"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{exam.timeLimit || 60} 分鐘</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{exam.passingScore} 分</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{exam.questionCount || 0} 題</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(exam.createdAt).toLocaleDateString('zh-TW')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 只有選中的考試才顯示操作按鈕 */}
                            {isSelected && (
                              <>
                                {/* 預覽按鈕 - 所有狀態都可用 */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewExamId(exam.id);
                                    setShowPreviewDialog(true);
                                  }}
                                  title="預覽考試"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  預覽
                                </Button>
                                
                                {/* 統計按鈕 - 已發布的考試才顯示 */}
                                {exam.status !== 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLocation(`/exam/${exam.id}/statistics`)}
                                  >
                                    <BarChart3 className="h-4 w-4 mr-1" />
                                    統計
                                  </Button>
                                )}
                                
                                {/* 分析按鈕 - 已發布的考試才顯示 */}
                                {exam.status !== 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLocation(`/exam/${exam.id}/analytics`)}
                                  >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    分析
                                  </Button>
                                )}
                                
                                {/* 審查編輯按鈕 - 已發布的考試使用，進入完整編輯頁面 */}
                                {exam.status !== 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLocation(`/exams/${exam.id}`)}
                                    className="text-blue-600 hover:text-blue-700"
                                    title="進入完整編輯頁面進行審查和調整"
                                  >
                                    <FileEdit className="h-4 w-4 mr-1" />
                                    審查編輯
                                  </Button>
                                )}
                                
                                {/* 快速編輯按鈕 - 草稿狀態使用，開啟對話框快速修改 */}
                                {exam.status === 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(exam)}
                                    className="text-green-600 hover:text-green-700"
                                    title="快速修改基本資訊"
                                  >
                                    <Zap className="h-4 w-4 mr-1" />
                                    快速編輯
                                  </Button>
                                )}
                                
                                {/* 指派考生按鈕 - 所有狀態都可用 */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAssign(exam)}
                                >
                                  <Users className="h-4 w-4 mr-1" />
                                  指派考生
                                </Button>
                                
                                {/* 刪除按鈕 - 草稿狀態所有人可刪，已發布只有管理員可刪 */}
                                {(exam.status === 'draft' || (exam.status === 'published' && user?.role === 'admin')) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(exam)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    刪除
                                  </Button>
                                )}
                              </>
                            )}
                            {!isSelected && (
                              <span className="text-sm text-muted-foreground">請先選擇考試</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 建立考試精靈 */}
        <CreateExamWizard
          open={showCreateWizard}
          onOpenChange={setShowCreateWizard}
          onSuccess={refetch}
        />

        {/* 編輯考試對話框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>編輯考試</DialogTitle>
              <DialogDescription>
                修改考試基本資訊
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">考試名稱 *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：新人培訓考試"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">考試說明</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="簡要說明考試內容和目的"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-timeLimit">考試時長（分鐘）*</Label>
                  <Input
                    id="edit-timeLimit"
                    type="number"
                    min={1}
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-passingScore">及格分數 *</Label>
                  <Input
                    id="edit-passingScore"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={updateExamMutation.isPending}>
                {updateExamMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 批次指派考生對話框 */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>指派考生 - {selectedExam?.title}</DialogTitle>
              <DialogDescription>
                選擇要指派的考生，支援多選和批次指派
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 搜尋欄 */}
              <div className="space-y-2">
                <Label htmlFor="search">搜尋員工</Label>
                <Input
                  id="search"
                  placeholder="輸入姓名或電子郵件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* 統計資訊 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  已選擇 {selectedUserIds.length} 位員工
                </span>
              </div>
              
              {/* 按部門分組的員工列表 */}
              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                {departments && Object.entries(filteredEmployeesByDepartment).map(([deptId, emps]) => {
                  const deptIdNum = Number(deptId);
                  const dept = departments.find(d => d.id === deptIdNum);
                  const deptName = deptIdNum === 0 ? "未分配部門" : (dept?.name || "未知部門");
                  const isExpanded = expandedDepartments.has(deptIdNum);
                  const deptEmployeeIds = (emps || []).map(e => e.id);
                  const allSelected = deptEmployeeIds.length > 0 && deptEmployeeIds.every(id => selectedUserIds.includes(id));
                  const someSelected = deptEmployeeIds.some(id => selectedUserIds.includes(id)) && !allSelected;
                  
                  return (
                    <div key={deptId} className="border-b last:border-b-0">
                      {/* 部門標題 */}
                      <div 
                        className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleDepartment(deptIdNum)}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectAllInDepartment(deptIdNum);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-medium">{deptName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(emps || []).length} 人
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </div>
                      
                      {/* 部門員工列表 */}
                      {isExpanded && (
                        <div className="divide-y">
                          {(emps || []).map((emp: any) => (
                            <div
                              key={emp.id}
                              className="flex items-center gap-3 p-3 pl-10 hover:bg-muted/30 cursor-pointer"
                              onClick={() => toggleEmployeeSelection(emp.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(emp.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleEmployeeSelection(emp.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 cursor-pointer"
                              />
                              <div className="flex-1">
                                <p className="font-medium">{emp.name || "未設定姓名"}</p>
                                {emp.email && (
                                  <p className="text-sm text-muted-foreground">{emp.email}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {Object.keys(filteredEmployeesByDepartment).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  沒有找到符合條件的員工
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAssignDialog(false);
                setSelectedUserIds([]);
                setSearchQuery("");
              }}>
                取消
              </Button>
              <Button 
                onClick={handleBatchAssign} 
                disabled={batchAssignMutation.isPending || selectedUserIds.length === 0}
              >
                {batchAssignMutation.isPending ? "指派中..." : `指派 ${selectedUserIds.length} 位員工`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 刪除確認對話框 */}
        {/* 刪除影響分析對話框 */}
        <ExamDeletionImpactDialog
          open={showImpactDialog}
          onOpenChange={setShowImpactDialog}
          examIds={isBatchMode ? selectedExamIds : selectedExamId ? [selectedExamId] : []}
          onConfirm={confirmDelete}
          isBatch={isBatchMode}
        />
        
        {/* 考試預覽對話框 */}
        <ExamPreviewDialog
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          examId={previewExamId}
        />
      </div>
    </div>
  );
}

