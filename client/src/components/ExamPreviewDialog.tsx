import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Clock, 
  Target, 
  FileText, 
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import QuestionPreviewDialog from "./QuestionPreviewDialog";

interface ExamPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number;
}

interface ExamWithQuestions {
  id: number;
  title: string;
  description: string | null;
  timeLimit: number | null;
  passingScore: number;
  totalScore: number;
  gradingMethod: string;
  status: string;
  questions?: Array<{
    id: number;
    question: string;
    type: string;
    difficulty: string;
    score: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export default function ExamPreviewDialog({
  open,
  onOpenChange,
  examId,
}: ExamPreviewDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number>(0);
  const questionsPerPage = 10;

  // 查詢考試詳細資訊
  const { data: examData, isLoading, error } = trpc.exams.getById.useQuery(
    examId,
    { enabled: open && examId > 0 }
  );
  const exam = examData as ExamWithQuestions | undefined;

  // 計算分頁
  const totalPages = exam?.questions 
    ? Math.ceil(exam.questions.length / questionsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = exam?.questions?.slice(startIndex, endIndex) || [];

  // 計算總分
  const totalScore = exam?.questions?.reduce((sum: number, q: any) => sum + (q.score || 0), 0) || 0;

  // 題型標籤
  const getQuestionTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      "true_false": { label: "是非題", variant: "default" },
      "multiple_choice": { label: "單選題", variant: "secondary" },
      "multiple_answer": { label: "多選題", variant: "outline" },
      "short_answer": { label: "簡答題", variant: "default" },
    };
    const config = typeMap[type] || { label: type, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 難度標籤
  const getDifficultyBadge = (difficulty: string) => {
    const difficultyMap: Record<string, { label: string; className: string }> = {
      easy: { label: "簡單", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      medium: { label: "中等", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
      hard: { label: "困難", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    };
    const config = difficultyMap[difficulty] || { label: difficulty, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // 狀態標籤
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "草稿", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
      published: { label: "已發布", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      archived: { label: "已封存", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
    };
    const config = statusMap[status] || { label: status, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                考試預覽：{exam?.title}
              </span>
              {exam && getStatusBadge(exam.status)}
            </DialogTitle>
            <DialogDescription>
              以考生視角預覽考試的完整資訊和題目列表
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">載入中...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="font-semibold">載入失敗</p>
                <p className="text-sm mt-1">{error.message}</p>
              </div>
            )}

            {exam && !isLoading && !error && (
              <>
                {/* 考試基本資訊 */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">題目數量</p>
                          <p className="text-2xl font-bold">{exam.questions?.length || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">時間限制</p>
                          <p className="text-2xl font-bold">
                            {exam.timeLimit ? `${exam.timeLimit} 分` : "無限制"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                          <Target className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">總分 / 及格分數</p>
                          <p className="text-2xl font-bold">
                            {totalScore} / {exam.passingScore}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 考試描述 */}
                {exam.description && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2">考試說明</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{exam.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* 題目列表 */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    題目列表
                    {exam.questions && exam.questions.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        （共 {exam.questions.length} 題，總分 {totalScore} 分）
                      </span>
                    )}
                  </h3>

                  {!exam.questions || exam.questions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        此考試尚未新增題目
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 bg-muted">#</TableHead>
                              <TableHead className="bg-muted">題目</TableHead>
                              <TableHead className="w-24 bg-muted">題型</TableHead>
                              <TableHead className="w-24 bg-muted">難度</TableHead>
                              <TableHead className="w-20 bg-muted text-right">分數</TableHead>
                              <TableHead className="w-20 bg-muted text-center">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentQuestions.map((question: any, index: number) => (
                              <TableRow key={question.id}>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {startIndex + index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-md">
                                    <p className="line-clamp-2">{question.content}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getQuestionTypeBadge(question.type)}
                                </TableCell>
                                <TableCell>
                                  {getDifficultyBadge(question.difficulty)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {question.score}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedQuestionId(question.id);
                                      setShowQuestionPreview(true);
                                    }}
                                    title="預覽題目"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 分頁控制 */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            顯示第 {startIndex + 1} - {Math.min(endIndex, exam.questions.length)} 題
                            （共 {exam.questions.length} 題）
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              上一頁
                            </Button>
                            <span className="text-sm">
                              第 {currentPage} / {totalPages} 頁
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              下一頁
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 題目預覽對話框 */}
      <QuestionPreviewDialog
        open={showQuestionPreview}
        onOpenChange={setShowQuestionPreview}
        questionId={selectedQuestionId}
      />
    </>
  );
}

