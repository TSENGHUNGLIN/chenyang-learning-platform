import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function ExamTake() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const examId = params.id ? parseInt(params.id) : 0;

  // 狀態管理
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // API查詢
  const { data: examData, isLoading } = trpc.exams.getForTaking.useQuery(examId);
  const { data: submissions } = trpc.exams.getSubmissions.useQuery(
    examData?.assignment?.id || 0,
    { enabled: !!examData?.assignment?.id }
  );

  // API mutations
  const startExamMutation = trpc.exams.start.useMutation();
  const saveAnswerMutation = trpc.exams.saveAnswer.useMutation();
  const submitExamMutation = trpc.exams.submit.useMutation();

  // 初始化：載入已儲存的答案
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      const savedAnswers: Record<number, string> = {};
      submissions.forEach((sub: any) => {
        savedAnswers[sub.questionId] = sub.answer;
      });
      setAnswers(savedAnswers);
    }
  }, [submissions]);

  // 初始化：開始考試
  useEffect(() => {
    if (examData && examData.assignment && !examData.assignment.startTime) {
      startExamMutation.mutate(examData.assignment.id);
    }
  }, [examData]);

  // 初始化：設定倒數計時器
  useEffect(() => {
    if (examData && examData.exam.timeLimit && examData.assignment) {
      const startTime = examData.assignment.startTime
        ? new Date(examData.assignment.startTime).getTime()
        : Date.now();
      const timeLimitMs = examData.exam.timeLimit * 60 * 1000;
      const endTime = startTime + timeLimitMs;
      
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          handleSubmit();
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(interval);
    }
  }, [examData]);

  // 自動儲存答案
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (examData && examData.assignment) {
        Object.entries(answers).forEach(([questionId, answer]) => {
          saveAnswerMutation.mutate({
            assignmentId: examData.assignment.id,
            questionId: parseInt(questionId),
            answer,
          });
        });
      }
    }, 2000); // 2秒後自動儲存

    return () => clearTimeout(autoSave);
  }, [answers]);

  // 處理答案改變
  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // 處理提交考試
  const handleSubmit = async () => {
    if (!examData || !examData.assignment) return;

    setIsSubmitting(true);
    try {
      // 儲存所有答案
      await Promise.all(
        Object.entries(answers).map(([questionId, answer]) =>
          saveAnswerMutation.mutateAsync({
            assignmentId: examData.assignment.id,
            questionId: parseInt(questionId),
            answer,
          })
        )
      );

      // 提交考試
      await submitExamMutation.mutateAsync(examData.assignment.id);

      toast.success("考試已提交！正在評分...");
      // 導航到成績頁面（使用assignmentId）
      setLocation(`/exam/${examData.assignment.id}/result`);
    } catch (error) {
      toast.error("提交失敗，請稍後再試");
      setIsSubmitting(false);
    }
  };

  // 格式化時間
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入考試中...</p>
        </div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            無法載入考試，您可能沒有權限參加此考試。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { exam, questions } = examData;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
        {/* 考試資訊卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{exam.title}</CardTitle>
                <CardDescription>
                  {exam.description || "請仔細閱讀題目並作答"}
                </CardDescription>
              </div>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className={`h-5 w-5 ${timeRemaining < 300 ? 'text-red-500' : 'text-primary'}`} />
                  <span className={timeRemaining < 300 ? 'text-red-500' : ''}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>答題進度</span>
                  <span className="font-semibold">{answeredCount} / {questions.length}</span>
                </div>
                <Progress value={progress} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {questions.map((q: any, index: number) => (
                  <Button
                    key={q.questionId}
                    variant={index === currentQuestionIndex ? "default" : answers[q.questionId] ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(index)}
                    className="w-10 h-10 p-0"
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 題目卡片 */}
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>第 {currentQuestionIndex + 1} 題</span>
                {answers[currentQuestion.questionId] && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </CardTitle>
              <CardDescription>
                {currentQuestion.question.type === 'true_false' && '是非題'}
                {currentQuestion.question.type === 'multiple_choice' && '選擇題'}
                {currentQuestion.question.type === 'short_answer' && '問答題'}
                {' · '}
                {currentQuestion.points} 分
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-lg">{currentQuestion.question.question}</div>

              {/* 是非題 */}
              {currentQuestion.question.type === 'true_false' && (
                <RadioGroup
                  value={answers[currentQuestion.questionId] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.questionId, value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="是" id="true" />
                    <Label htmlFor="true" className="cursor-pointer">是</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="否" id="false" />
                    <Label htmlFor="false" className="cursor-pointer">否</Label>
                  </div>
                </RadioGroup>
              )}

              {/* 選擇題 */}
              {currentQuestion.question.type === 'multiple_choice' && currentQuestion.question.options && (
                <RadioGroup
                  value={answers[currentQuestion.questionId] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.questionId, value)}
                >
                  {JSON.parse(currentQuestion.question.options).map((option: any) => (
                    <div key={option.label} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.label} id={option.label} />
                      <Label htmlFor={option.label} className="cursor-pointer">
                        {option.label}. {option.value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* 問答題 */}
              {currentQuestion.question.type === 'short_answer' && (
                <Textarea
                  placeholder="請輸入您的答案..."
                  value={answers[currentQuestion.questionId] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                  rows={6}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* 導航按鈕 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            上一題
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              提交考試
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            >
              下一題
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* 提交確認對話框 */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>確認提交考試</DialogTitle>
              <DialogDescription>
                您確定要提交考試嗎？提交後將無法修改答案。
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p>總題數：{questions.length} 題</p>
                    <p>已作答：{answeredCount} 題</p>
                    <p>未作答：{questions.length - answeredCount} 題</p>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "提交中..." : "確認提交"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

