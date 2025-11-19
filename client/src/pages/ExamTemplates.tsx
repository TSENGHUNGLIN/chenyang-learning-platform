import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Copy,
  Eye,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function ExamTemplates() {
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    timeLimit: 60,
    passingScore: 60,
  });

  // 查詢範本列表
  const { data: templates, isLoading, refetch } = trpc.examTemplates.list.useQuery();

  // 建立範本
  const createTemplateMutation = trpc.examTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("範本已建立");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "建立失敗");
    },
  });

  // 更新範本
  const updateTemplateMutation = trpc.examTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("範本已更新");
      setShowEditDialog(false);
      setSelectedTemplate(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失敗");
    },
  });

  // 刪除範本
  const deleteTemplateMutation = trpc.examTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("範本已刪除");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  // 從範本建立考卷
  const createExamMutation = trpc.examTemplates.createExamFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(
        `已成功建立考卷！共 ${data.questionCount} 道題目，總分 ${data.totalScore} 分`,
        {
          action: {
            label: "立即查看",
            onClick: () => setLocation(`/exams/${data.id}`),
          },
        }
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "建立考卷失敗");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      timeLimit: 60,
      passingScore: 60,
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("請輸入範本名稱");
      return;
    }

    createTemplateMutation.mutate({
      name: formData.name,
      description: formData.description,
      timeLimit: formData.timeLimit,
      passingScore: formData.passingScore,
      gradingMethod: "auto",
    });
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      timeLimit: template.timeLimit || 60,
      passingScore: template.passingScore,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;

    if (!formData.name.trim()) {
      toast.error("請輸入範本名稱");
      return;
    }

    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      name: formData.name,
      description: formData.description,
      timeLimit: formData.timeLimit,
      passingScore: formData.passingScore,
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`確定要刪除範本「${name}」嗎？此操作無法復原。`)) {
      return;
    }

    deleteTemplateMutation.mutate(id);
  };

  const handleCreateExam = (templateId: number, templateName: string) => {
    createExamMutation.mutate({
      templateId,
      title: `${templateName}（${new Date().toLocaleDateString("zh-TW")}）`,
      status: "draft",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {/* 標題區域 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">考卷範本</h1>
              <p className="text-muted-foreground mt-1">
                建立和管理考卷範本，快速複製建立新考卷
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            建立範本
          </Button>
        </div>

        {/* 範本列表 */}
        {!templates || templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">尚無範本</p>
              <p className="text-sm text-muted-foreground mt-2">
                點擊「建立範本」開始建立第一個範本
              </p>
              <Button
                className="mt-6"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                建立範本
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex justify-between">
                      <span>時間限制：</span>
                      <span className="font-medium text-foreground">
                        {template.timeLimit ? `${template.timeLimit} 分鐘` : "無限制"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>及格分數：</span>
                      <span className="font-medium text-foreground">
                        {template.passingScore} 分
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>建立日期：</span>
                      <span className="font-medium text-foreground">
                        {new Date(template.createdAt).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCreateExam(template.id, template.name)}
                      disabled={createExamMutation.isPending}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      建立考卷
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info("功能開發中")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                      disabled={deleteTemplateMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 建立範本對話框 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>建立考卷範本</DialogTitle>
              <DialogDescription>
                建立一個可重複使用的考卷範本
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">範本名稱 *</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：新人考核範本"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">範本說明</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="簡要說明範本用途"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-timeLimit">考試時長（分鐘）</Label>
                  <Input
                    id="create-timeLimit"
                    type="number"
                    min={1}
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-passingScore">及格分數</Label>
                  <Input
                    id="create-passingScore"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                註：建立範本後，可以在範本詳細頁面中新增題目
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? "建立中..." : "建立"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 編輯範本對話框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>編輯範本</DialogTitle>
              <DialogDescription>
                修改範本基本資訊
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">範本名稱 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：新人考核範本"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">範本說明</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="簡要說明範本用途"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-timeLimit">考試時長（分鐘）</Label>
                  <Input
                    id="edit-timeLimit"
                    type="number"
                    min={1}
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-passingScore">及格分數</Label>
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
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedTemplate(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

