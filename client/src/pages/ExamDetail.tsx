import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Play,
  GripVertical,
  Save,
  FileStack,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import QuestionSelector from "@/components/QuestionSelector";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ExamDetail() {
  const params = useParams();
  const examId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editPoints, setEditPoints] = useState<number>(1);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const { user } = useAuth();
  const createAssignmentMutation = trpc.exams.assign.useMutation();
  const startExamMutation = trpc.exams.start.useMutation();

  // 查詢考卷資訊
  const { data: exam, isLoading: examLoading, refetch: refetchExam } = trpc.exams.getById.useQuery(examId);
  
  // 查詢考卷題目
  const { data: questions, isLoading: questionsLoading, refetch: refetchQuestions } = trpc.exams.getQuestions.useQuery(examId);

  // 更新題目
  const updateQuestionMutation = trpc.exams.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("題目已更新");
      setShowEditDialog(false);
      setEditingQuestion(null);
      refetchQuestions();
      refetchExam();
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失敗");
    },
  });

  // 刪除題目
  const deleteQuestionMutation = trpc.exams.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("題目已刪除");
      refetchQuestions();
      refetchExam();
    },
    onError: (error: any) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  // 從考卷建立範本
  const createTemplateMutation = trpc.examTemplates.createFromExam.useMutation({
    onSuccess: () => {
      toast.success("範本已建立");
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
    },
    onError: (error: any) => {
      toast.error(error.message || "建立範本失敗");
    },
  });

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setEditPoints(question.points || 1);
    setShowEditDialog(true);
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;

    updateQuestionMutation.mutate({
      examId,
      questionId: editingQuestion.questionId,
      points: editPoints,
    });
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (!confirm("確定要刪除這道題目嗎？")) return;

    deleteQuestionMutation.mutate({
      examId,
      questionId,
    });
  };

  // 開始考試
  const handleStartExam = async () => {
    if (!user) {
      toast.error("請先登入");
      return;
    }

    try {
      // 建立考試指派（自己指派給自己）
      const assignment = await createAssignmentMutation.mutateAsync({
        examId,
        userId: user.id,
      });

      // 開始考試
      await startExamMutation.mutateAsync(assignment.id);

      // 跳轉到考試作答頁面
      setLocation(`/exam/${assignment.id}/take`);
    } catch (error: any) {
      toast.error(error.message || "開始考試失敗");
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trueFalse: "是非題",
      multipleChoice: "選擇題",
      shortAnswer: "問答題",
    };
    return labels[type] || type;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
      easy: { text: "簡單", variant: "secondary" },
      medium: { text: "中等", variant: "default" },
      hard: { text: "困難", variant: "destructive" },
    };
    return labels[difficulty] || { text: difficulty, variant: "secondary" };
  };

  if (examLoading || questionsLoading) {
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

  if (!exam) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">找不到考卷</p>
            <Button className="mt-4" onClick={() => setLocation("/exams")}>
              返回考試管理
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalScore = questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {/* 標題區域 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/exams")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{exam.title}</h1>
              {exam.description && (
                <p className="text-muted-foreground mt-1">{exam.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(true)}>
              <FileStack className="h-4 w-4 mr-2" />
              另存為範本
            </Button>
            <Button onClick={handleStartExam}>
              <Play className="h-4 w-4 mr-2" />
              開始考試
            </Button>
          </div>
        </div>

        {/* 考卷資訊卡片 */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                題目數量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{questions?.length || 0} 題</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                總分
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScore} 分</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                及格分數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exam.passingScore} 分</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                時間限制
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exam.timeLimit ? `${exam.timeLimit} 分鐘` : "無限制"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 題目列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>題目列表</CardTitle>
                <CardDescription>
                  共 {questions?.length || 0} 道題目
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddQuestionDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新增題目
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!questions || questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">尚無題目</p>
                <Button
                  className="mt-4"
                  onClick={() => setShowAddQuestionDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增第一道題目
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-16">題號</TableHead>
                    <TableHead className="w-24">題型</TableHead>
                    <TableHead className="w-24">難度</TableHead>
                    <TableHead>題目內容</TableHead>
                    <TableHead className="w-20">分數</TableHead>
                    <TableHead className="w-32 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question: any, index: number) => {
                    const difficultyInfo = getDifficultyLabel(question.difficulty);
                    return (
                      <TableRow key={question.questionId}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </TableCell>
                        <TableCell className="font-medium">
                          {question.questionOrder || index + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getQuestionTypeLabel(question.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={difficultyInfo.variant}>
                            {difficultyInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {question.content}
                        </TableCell>
                        <TableCell className="font-medium">
                          {question.points} 分
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQuestion(question)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteQuestion(question.questionId)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 編輯題目對話框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯題目</DialogTitle>
              <DialogDescription>
                修改題目的分數配置
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>題目內容</Label>
                <p className="text-sm text-muted-foreground">
                  {editingQuestion?.content}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-points">分數 *</Label>
                <Input
                  id="edit-points"
                  type="number"
                  min={0}
                  value={editPoints}
                  onChange={(e) => setEditPoints(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingQuestion(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleUpdateQuestion}
                disabled={updateQuestionMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateQuestionMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 新增題目對話框 - 使用 QuestionSelector 元件 */}
        <QuestionSelector
          open={showAddQuestionDialog}
          onOpenChange={setShowAddQuestionDialog}
          examId={examId}
          onSuccess={() => {
            refetchQuestions();
            refetchExam();
          }}
        />

        {/* 另存為範本對話框 */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>另存為範本</DialogTitle>
              <DialogDescription>
                將此考卷儲存為範本，以便快速建立類似的考卷
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">範本名稱 *</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="例如：新人考核範本"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">範本說明</Label>
                <Textarea
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="簡要說明範本用途"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveTemplateDialog(false);
                  setTemplateName("");
                  setTemplateDescription("");
                }}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  if (!templateName.trim()) {
                    toast.error("請輸入範本名稱");
                    return;
                  }
                  createTemplateMutation.mutate({
                    examId,
                    name: templateName,
                    description: templateDescription,
                  });
                }}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? "建立中..." : "建立範本"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

