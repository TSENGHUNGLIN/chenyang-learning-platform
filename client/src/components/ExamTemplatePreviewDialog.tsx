import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Copy, 
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface ExamTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: number;
  onCreateExam?: () => void;
}

interface TemplateWithQuestions {
  id: number;
  name: string;
  description: string | null;
  timeLimit: number | null;
  passingScore: number;
  gradingMethod: string;
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

export default function ExamTemplatePreviewDialog({
  open,
  onOpenChange,
  templateId,
  onCreateExam,
}: ExamTemplatePreviewDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;

  // 查詢範本詳細資訊
  const { data: templateData, isLoading, error } = trpc.examTemplates.getById.useQuery(
    templateId,
    { enabled: open && templateId > 0 }
  );
  const template = templateData as TemplateWithQuestions | undefined;

  // 計算分頁
  const totalPages = template?.questions 
    ? Math.ceil(template.questions.length / questionsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = template?.questions?.slice(startIndex, endIndex) || [];

  // 題型標籤顏色
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

  // 難度標籤顏色
  const getDifficultyBadge = (difficulty: string) => {
    const difficultyMap: Record<string, { label: string; className: string }> = {
      easy: { label: "簡單", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      medium: { label: "中等", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
      hard: { label: "困難", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    };
    const config = difficultyMap[difficulty] || { label: difficulty, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // 匯出範本為 PDF（未來功能）
  const handleExportPDF = () => {
    toast.info("PDF 匯出功能開發中");
  };

  // 匯出範本為 Word（未來功能）
  const handleExportWord = () => {
    toast.info("Word 匯出功能開發中");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              範本預覽：{template?.name}
            </span>
          </DialogTitle>
          <DialogDescription>
            查看範本的完整資訊和題目列表
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

          {template && !isLoading && !error && (
            <>
              {/* 範本基本資訊 */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">題目數量</p>
                        <p className="text-2xl font-bold">{template.questions?.length || 0}</p>
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
                          {template.timeLimit ? `${template.timeLimit} 分` : "無限制"}
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
                        <p className="text-sm text-muted-foreground">及格分數</p>
                        <p className="text-2xl font-bold">{template.passingScore} 分</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 範本描述 */}
              {template.description && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">範本描述</h3>
                    <p className="text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* 題目列表 */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  題目列表
                  {template.questions && template.questions.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      （共 {template.questions.length} 題）
                    </span>
                  )}
                </h3>

                {!template.questions || template.questions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      此範本尚未新增題目
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentQuestions.map((question, index) => (
                            <TableRow key={question.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-md">
                                  <p className="line-clamp-2">{question.question}</p>
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* 分頁控制 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          顯示第 {startIndex + 1} - {Math.min(endIndex, template.questions.length)} 題
                          （共 {template.questions.length} 題）
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

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              匯出 PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportWord}>
              <Download className="w-4 h-4 mr-2" />
              匯出 Word
            </Button>
          </div>
          {onCreateExam && (
            <Button onClick={onCreateExam}>
              <Copy className="w-4 h-4 mr-2" />
              使用此範本建立考試
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

