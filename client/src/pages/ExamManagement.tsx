import { useState } from "react";
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
import { ArrowLeft, Plus, Eye, Edit, Trash2, FileText, Calendar, Clock, Users, BarChart3 } from "lucide-react";
import CreateExamWizard from "@/components/CreateExamWizard";

export default function ExamManagement() {
  const [, setLocation] = useLocation();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
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
  
  // 查詢所有使用者（用於指派考生）
  const { data: users } = trpc.users.list.useQuery();
  
  // 建立考試
  const createExamMutation = trpc.exams.create.useMutation({
    onSuccess: () => {
      toast.success("考試已建立");
      setShowCreateDialog(false);
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
  
  // 刪除考試
  const deleteExamMutation = trpc.exams.delete.useMutation({
    onSuccess: () => {
      toast.success("考試已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
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

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個考試嗎？此操作無法復原。")) {
      deleteExamMutation.mutate(id);
    }
  };
  
  const handleAssign = (exam: any) => {
    setSelectedExam(exam);
    setShowAssignDialog(true);
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
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首頁
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">考試管理</h1>
              <p className="text-muted-foreground mt-1">建立、編輯和管理線上考試</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            建立考試
          </Button>
        </div>

        {/* 考試列表 */}
        {!exams || exams.length === 0 ? (
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>考試列表</CardTitle>
              <CardDescription>共 {exams.length} 個考試</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>考試名稱</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>時長</TableHead>
                    <TableHead>及格分數</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam: any) => {
                    const statusInfo = getStatusLabel(exam.status);
                    return (
                      <TableRow key={exam.id}>
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
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(exam.createdAt).toLocaleDateString('zh-TW')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/exam/${exam.id}/statistics`)}
                            >
                              <BarChart3 className="h-4 w-4 mr-1" />
                              統計
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/exams/${exam.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssign(exam)}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              指派考生
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(exam)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              編輯
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exam.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              刪除
                            </Button>
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
                <Label htmlFor="search">搜尋使用者</Label>
                <Input
                  id="search"
                  placeholder="輸入姓名或電子郵件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* 全選/取消全選 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  已選擇 {selectedUserIds.length} 位考生
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedUserIds.length === (users?.filter(u => 
                    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length || 0) ? "取消全選" : "全選"}
                </Button>
              </div>
              
              {/* 使用者列表 */}
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {users?.filter(u => 
                  u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{user.name || "未設定姓名"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                ))}
              </div>
              
              {users?.filter(u => 
                u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  沒有找到符合條件的使用者
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
                {batchAssignMutation.isPending ? "指派中..." : `指派 ${selectedUserIds.length} 位考生`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

