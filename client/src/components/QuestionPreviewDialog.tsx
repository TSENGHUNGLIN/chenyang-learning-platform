import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  FileQuestion,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface QuestionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: number;
}

export default function QuestionPreviewDialog({
  open,
  onOpenChange,
  questionId,
}: QuestionPreviewDialogProps) {
  // 查詢題目詳細資訊
  const { data: question, isLoading, error } = trpc.questions.getById.useQuery(
    questionId,
    { enabled: open && questionId > 0 }
  );

  // 題型標籤
  const getQuestionTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      "true-false": { label: "是非題", variant: "default" },
      "single-choice": { label: "單選題", variant: "secondary" },
      "multiple-choice": { label: "多選題", variant: "outline" },
      "short-answer": { label: "簡答題", variant: "default" },
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

  // 解析選項
  const parseOptions = (optionsStr: string | null): string[] => {
    if (!optionsStr) return [];
    try {
      return JSON.parse(optionsStr);
    } catch {
      return [];
    }
  };

  // 解析答案
  const parseAnswer = (answerStr: string | null): string | string[] => {
    if (!answerStr) return "";
    try {
      const parsed = JSON.parse(answerStr);
      return Array.isArray(parsed) ? parsed : String(parsed);
    } catch {
      return answerStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5" />
            題目預覽
          </DialogTitle>
          <DialogDescription>
            以考生視角預覽題目內容和答案
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

          {question && !isLoading && !error && (
            <>
              {/* 題目資訊 */}
              <div className="flex items-center gap-2 flex-wrap">
                {getQuestionTypeBadge(question.type)}
                {getDifficultyBadge(question.difficulty)}
                <Badge variant="outline">分數：{question.score} 分</Badge>
                {question.isAiGenerated && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    AI 生成
                  </Badge>
                )}
              </div>

              {/* 題目內容 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileQuestion className="w-5 h-5" />
                        題目
                      </h3>
                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                        {question.content}
                      </p>
                    </div>

                    {/* 是非題 */}
                    {question.type === "true-false" && (
                      <div className="space-y-3">
                        <RadioGroup disabled value={String(parseAnswer(question.answer))}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="true" />
                            <Label htmlFor="true" className="cursor-pointer">正確 (O)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="false" />
                            <Label htmlFor="false" className="cursor-pointer">錯誤 (X)</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {/* 單選題 */}
                    {question.type === "single-choice" && (
                      <div className="space-y-3">
                        <RadioGroup disabled value={String(parseAnswer(question.answer))}>
                          {parseOptions(question.options).map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(index)} id={`option-${index}`} />
                              <Label htmlFor={`option-${index}`} className="cursor-pointer">
                                {String.fromCharCode(65 + index)}. {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    {/* 多選題 */}
                    {question.type === "multiple-choice" && (
                      <div className="space-y-3">
                        {parseOptions(question.options).map((option, index) => {
                          const answer = parseAnswer(question.answer);
                          const isChecked = Array.isArray(answer) && answer.includes(String(index));
                          return (
                            <div key={index} className="flex items-center space-x-2">
                              <Checkbox 
                                disabled 
                                checked={isChecked}
                                id={`option-${index}`} 
                              />
                              <Label htmlFor={`option-${index}`} className="cursor-pointer">
                                {String.fromCharCode(65 + index)}. {option}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 簡答題 */}
                    {question.type === "short-answer" && (
                      <div>
                        <Textarea
                          disabled
                          placeholder="請在此輸入答案..."
                          className="min-h-[100px]"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 正確答案 */}
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      正確答案
                    </h3>
                    <div className="text-base">
                      {question.type === "true-false" && (
                        <p>{parseAnswer(question.answer) === "true" ? "正確 (O)" : "錯誤 (X)"}</p>
                      )}
                      {question.type === "single-choice" && (
                        <p>
                          {String.fromCharCode(65 + Number(parseAnswer(question.answer)))}. {" "}
                          {parseOptions(question.options)[Number(parseAnswer(question.answer))]}
                        </p>
                      )}
                      {question.type === "multiple-choice" && (
                        <div className="space-y-1">
                          {(parseAnswer(question.answer) as string[]).map((ans, idx) => (
                            <p key={idx}>
                              {String.fromCharCode(65 + Number(ans))}. {parseOptions(question.options)[Number(ans)]}
                            </p>
                          ))}
                        </div>
                      )}
                      {question.type === "short-answer" && (
                        <p className="whitespace-pre-wrap">{parseAnswer(question.answer)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 解釋說明 */}
              {question.explanation && (
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <AlertCircle className="w-5 h-5" />
                        解釋說明
                      </h3>
                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                        {question.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 題目出處 */}
              {question.source && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">題目出處：</span>
                  {question.source}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

