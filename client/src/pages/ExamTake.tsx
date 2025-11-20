import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Wifi, WifiOff, Save, Flag, Target } from "lucide-react";
import { toast } from "sonner";

// 本地儲存鍵值
const OFFLINE_ANSWERS_KEY = 'exam_offline_answers';
const LAST_SAVE_TIME_KEY = 'exam_last_save_time';

export default function ExamTake() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const assignmentId = params.assignmentId ? parseInt(params.assignmentId) : 0;

  // 狀態管理
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 用於追蹤已儲存的答案，避免重複儲存
  const savedAnswersRef = useRef<Record<number, string>>({});
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // API查詢
  const { data: examData, isLoading } = trpc.exams.getForTaking.useQuery(assignmentId);
  const { data: submissions } = trpc.exams.getSubmissions.useQuery(
    examData?.assignment?.id || 0,
    { enabled: !!examData?.assignment?.id }
  );

  // API mutations
  const startExamMutation = trpc.exams.start.useMutation();
  const saveAnswerMutation = trpc.exams.saveAnswer.useMutation();
  const submitExamMutation = trpc.exams.submit.useMutation();

  // 監聽網路狀態
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("網路已恢復，正在同步答案...");
      syncOfflineAnswers();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("網路已斷線，答案將暫存在本地");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 初始化：載入已儲存的答案
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      const savedAnswers: Record<number, string> = {};
      submissions.forEach((sub: any) => {
        savedAnswers[sub.questionId] = sub.answer;
      });
      setAnswers(savedAnswers);
      savedAnswersRef.current = savedAnswers;
    }

    // 載入離線答案
    const offlineAnswers = loadOfflineAnswers();
    if (offlineAnswers && Object.keys(offlineAnswers).length > 0) {
      setAnswers(prev => ({ ...prev, ...offlineAnswers }));
      toast.info("已載入離線暫存的答案");
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

  // 儲存答案到本地儲存
  const saveOfflineAnswers = useCallback((answersToSave: Record<number, string>) => {
    try {
      const key = `${OFFLINE_ANSWERS_KEY}_${assignmentId}`;
      localStorage.setItem(key, JSON.stringify(answersToSave));
      localStorage.setItem(`${LAST_SAVE_TIME_KEY}_${assignmentId}`, new Date().toISOString());
    } catch (error) {
      console.error('Failed to save offline answers:', error);
    }
  }, [assignmentId]);

  // 從本地儲存載入答案
  const loadOfflineAnswers = useCallback((): Record<number, string> | null => {
    try {
      const key = `${OFFLINE_ANSWERS_KEY}_${assignmentId}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load offline answers:', error);
      return null;
    }
  }, [assignmentId]);

  // 清除本地儲存的答案
  const clearOfflineAnswers = useCallback(() => {
    try {
      const key = `${OFFLINE_ANSWERS_KEY}_${assignmentId}`;
      localStorage.removeItem(key);
      localStorage.removeItem(`${LAST_SAVE_TIME_KEY}_${assignmentId}`);
    } catch (error) {
      console.error('Failed to clear offline answers:', error);
    }
  }, [assignmentId]);

  // 同步離線答案到伺服器
  const syncOfflineAnswers = useCallback(async () => {
    if (!examData || !examData.assignment || !isOnline) return;

    const offlineAnswers = loadOfflineAnswers();
    if (!offlineAnswers || Object.keys(offlineAnswers).length === 0) return;

    try {
      await saveBatchAnswers(offlineAnswers);
      clearOfflineAnswers();
      toast.success("離線答案已同步");
    } catch (error) {
      console.error('Failed to sync offline answers:', error);
    }
  }, [examData, isOnline]);

  // 批次儲存答案（帶重試機制）
  const saveBatchAnswers = useCallback(async (answersToSave: Record<number, string>, retryCount = 0) => {
    if (!examData || !examData.assignment) return;

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1秒

    try {
      setIsSaving(true);
      
      // 批次儲存所有答案
      const savePromises = Object.entries(answersToSave).map(([questionId, answer]) => {
        // 只儲存有變更的答案
        if (savedAnswersRef.current[parseInt(questionId)] === answer) {
          return Promise.resolve();
        }
        
        return saveAnswerMutation.mutateAsync({
          assignmentId: examData.assignment.id,
          questionId: parseInt(questionId),
          answer,
        }).then(() => {
          // 更新已儲存的答案記錄
          savedAnswersRef.current[parseInt(questionId)] = answer;
        });
      });

      await Promise.all(savePromises);
      
      setLastSaveTime(new Date());
      setPendingAnswers({});
      setIsSaving(false);
      
    } catch (error: any) {
      console.error('Failed to save answers:', error);
      
      // 如果是網路錯誤且還有重試次數，則重試
      if (retryCount < MAX_RETRIES && (error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return saveBatchAnswers(answersToSave, retryCount + 1);
      }
      
      // 如果重試失敗或不是網路錯誤，儲存到本地
      if (!isOnline || retryCount >= MAX_RETRIES) {
        saveOfflineAnswers(answersToSave);
        toast.error("儲存失敗，答案已暫存在本地");
      }
      
      setIsSaving(false);
      throw error;
    }
  }, [examData, isOnline, saveOfflineAnswers]);

  // 自動儲存答案（優化版：5秒批次儲存）
  useEffect(() => {
    // 清除之前的計時器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 找出有變更的答案
    const changedAnswers: Record<number, string> = {};
    Object.entries(answers).forEach(([questionId, answer]) => {
      if (savedAnswersRef.current[parseInt(questionId)] !== answer) {
        changedAnswers[parseInt(questionId)] = answer;
      }
    });

    // 如果有變更的答案，設定5秒後儲存
    if (Object.keys(changedAnswers).length > 0) {
      setPendingAnswers(changedAnswers);
      
      saveTimerRef.current = setTimeout(() => {
        if (examData && examData.assignment) {
          saveBatchAnswers(changedAnswers).catch(err => {
            console.error('Auto-save failed:', err);
          });
        }
      }, 30000); // 30秒後自動儲存
    }

    // 總是儲存到本地（即使離線也能保存）
    if (Object.keys(answers).length > 0) {
      saveOfflineAnswers(answers);
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [answers, examData, saveBatchAnswers, saveOfflineAnswers]);

  // 處理答案改變
  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // 切換標記待檢查
  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // 處理提交考試
  const handleSubmit = async () => {
    if (!examData || !examData.assignment) return;

    setIsSubmitting(true);
    try {
      // 先儲存所有答案（包含待儲存的）
      const allAnswers = { ...answers, ...pendingAnswers };
      await saveBatchAnswers(allAnswers);

      // 提交考試
      await submitExamMutation.mutateAsync(examData.assignment.id);

      // 清除本地儲存
      clearOfflineAnswers();

      toast.success("考試已提交！正在評分...");
      // 導航到成績頁面（使用assignmentId）
      setLocation(`/exam/${examData.assignment.id}/result`);
    } catch (error: any) {
      toast.error(error.message || "提交失敗，請稍後再試");
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

  // 檢查考試是否有題目
  if (!questions || questions.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            此考試尚未設定題目，請聯繫管理員。
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          onClick={() => setLocation('/my-exams')}
        >
          返回考試列表
        </Button>
      </div>
    );
  }
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
        {/* 網路狀態提示 */}
        {!isOnline && (
          <Alert className="mb-4 border-orange-500 bg-orange-50">
            <WifiOff className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700">
              網路已斷線，答案將暫存在本地，網路恢復後會自動同步
            </AlertDescription>
          </Alert>
        )}

        {/* 考試資訊卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>{exam.title}</CardTitle>
                  {assignment.isPractice === 1 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      <Target className="h-3 w-3 mr-1" />
                      模擬模式
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {assignment.isPractice === 1 
                    ? "此為模擬練習，不計入正式成績" 
                    : (exam.description || "請仔細閱讀題目並作答")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {/* 儲存狀態指示器 */}
                <div className="flex items-center gap-2 text-sm">
                  {isSaving ? (
                    <>
                      <Save className="h-4 w-4 animate-pulse text-blue-500" />
                      <span className="text-blue-500">儲存中...</span>
                    </>
                  ) : Object.keys(pendingAnswers).length > 0 ? (
                    <>
                      <Save className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-500">待儲存</span>
                    </>
                  ) : lastSaveTime ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">已儲存</span>
                    </>
                  ) : null}
                </div>

                {/* 網路狀態指示器 */}
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-orange-500" />
                  )}
                </div>

                {/* 倒數計時器 */}
                {timeRemaining !== null && (
                  <div className="flex items-center gap-2">
                    <Clock className={`h-6 w-6 ${timeRemaining < 300 ? 'text-red-500 animate-pulse' : timeRemaining < 600 ? 'text-orange-500' : 'text-primary'}`} />
                    <span className={`text-3xl font-bold tabular-nums ${
                      timeRemaining < 300 ? 'text-red-500' : 
                      timeRemaining < 600 ? 'text-orange-500' : 
                      'text-primary'
                    }`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                )}
              </div>
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
                {questions.map((q: any, index: number) => {
                  const isAnswered = !!answers[q.questionId];
                  const isMarked = markedForReview.has(q.questionId);
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <Button
                      key={q.questionId}
                      variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-10 h-10 p-0 relative ${
                        isMarked ? 'ring-2 ring-orange-500' : ''
                      }`}
                    >
                      {index + 1}
                      {isMarked && (
                        <Flag className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 fill-orange-500" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 題目卡片 */}
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span>第 {currentQuestionIndex + 1} 題</span>
                  {answers[currentQuestion.questionId] && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {markedForReview.has(currentQuestion.questionId) && (
                    <Flag className="h-5 w-5 text-orange-500 fill-orange-500" />
                  )}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleMarkForReview(currentQuestion.questionId)}
                  className={markedForReview.has(currentQuestion.questionId) ? 'border-orange-500 text-orange-500' : ''}
                >
                  <Flag className={`h-4 w-4 mr-2 ${markedForReview.has(currentQuestion.questionId) ? 'fill-orange-500' : ''}`} />
                  {markedForReview.has(currentQuestion.questionId) ? '取消標記' : '標記待檢查'}
                </Button>
              </div>
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
                    {markedForReview.size > 0 && (
                      <p className="text-orange-600">標記待檢查：{markedForReview.size} 題</p>
                    )}
                    {Object.keys(pendingAnswers).length > 0 && (
                      <p className="text-orange-600">待儲存答案：{Object.keys(pendingAnswers).length} 題</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || isSaving}>
                {isSubmitting ? "提交中..." : isSaving ? "儲存中..." : "確認提交"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

