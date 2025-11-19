import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, Home, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ExamResultProps {
  params: {
    assignmentId: string;
  };
}

export default function ExamResult({ params }: ExamResultProps) {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const assignmentId = parseInt(params.assignmentId);

  // 取得考試指派資訊
  const { data: assignment, isLoading: assignmentLoading } = trpc.exams.getAssignment.useQuery(assignmentId);

  // 取得考試成績
  const { data: score, isLoading: scoreLoading } = trpc.exams.getScore.useQuery(assignmentId);

  // 取得考試題目和答案
  const { data: submissions, isLoading: submissionsLoading } = trpc.exams.getSubmissions.useQuery(assignmentId);

  // 取得考試資訊
  const { data: exam, isLoading: examLoading } = trpc.exams.getById.useQuery(
    assignment?.examId || 0,
    { enabled: !!assignment }
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || assignmentLoading || scoreLoading || submissionsLoading || examLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">載入成績中...</p>
        </div>
      </div>
    );
  }

  // 檢查考試指派和考試資訊是否存在
  if (!assignment || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>找不到考試</CardTitle>
            <CardDescription>無法載入考試資訊</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/my-exams")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回考試列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 檢查考試是否已提交和評分
  if (!score) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>成績尚未公布</CardTitle>
            <CardDescription>
              {assignment.status === "in_progress" 
                ? "考試尚未提交，請先完成考試並提交答案" 
                : "考試已提交，正在評分中，請稍後再查看成績"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignment.status === "in_progress" && (
              <Button 
                onClick={() => navigate(`/exam/${assignmentId}/take`)} 
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                繼續作答
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate("/my-exams")} 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回考試列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPassed = score.passed === 1;
  const percentage = score.percentage;
  const passingScore = exam.passingScore || 60;

  // 計算答題統計
  const totalQuestions = submissions?.length || 0;
  const correctAnswers = submissions?.filter((s) => s.isCorrect === 1).length || 0;
  const wrongAnswers = submissions?.filter((s) => s.isCorrect === 0).length || 0;
  const unanswered = submissions?.filter((s) => !s.answer || s.answer.trim() === "").length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-4xl mx-auto">
        {/* 頁首導航 */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            返回首頁
          </Button>
          <Button variant="outline" onClick={() => navigate("/my-exams")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回考試列表
          </Button>
        </div>

        {/* 成績總覽卡片 */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isPassed ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-3xl">{exam.title}</CardTitle>
            <CardDescription>考試成績</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-bold text-primary mb-2">{percentage}%</div>
                <div className="text-sm text-muted-foreground">總分百分比</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {score.totalScore}/{score.maxScore}
                </div>
                <div className="text-sm text-muted-foreground">實際得分</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Badge
                  variant={isPassed ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {isPassed ? "及格" : "不及格"}
                </Badge>
                <div className="text-sm text-muted-foreground mt-2">
                  及格標準：{passingScore}%
                </div>
              </div>
            </div>

            {/* 答題統計 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-2xl font-bold text-green-600">{correctAnswers}</span>
                </div>
                <div className="text-sm text-muted-foreground">答對</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-2xl font-bold text-red-600">{wrongAnswers}</span>
                </div>
                <div className="text-sm text-muted-foreground">答錯</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Minus className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-2xl font-bold text-gray-600">{unanswered}</span>
                </div>
                <div className="text-sm text-muted-foreground">未答</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 答題詳情 */}
        <Card>
          <CardHeader>
            <CardTitle>答題詳情</CardTitle>
            <CardDescription>查看每題的作答情況和正確答案</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions?.map((submission, index) => {
                const isCorrect = submission.isCorrect === 1;
                const hasAnswer = submission.answer && submission.answer.trim() !== "";
                let aiEvaluation = null;
                try {
                  aiEvaluation = submission.aiEvaluation
                    ? JSON.parse(submission.aiEvaluation)
                    : null;
                } catch (e) {
                  // 解析失敗，忽略
                }

                return (
                  <div key={submission.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">第 {index + 1} 題</span>
                          {isCorrect ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              正確
                            </Badge>
                          ) : hasAnswer ? (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              錯誤
                            </Badge>
                          ) : (
                            <Badge variant="secondary">未作答</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {submission.score || 0} / {submission.score || 10} 分
                          </span>
                        </div>
                        <div className="text-sm mb-3">{submission.question?.question}</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-semibold mb-1 text-muted-foreground">
                          你的答案：
                        </div>
                        <div className={`text-sm p-2 rounded ${isCorrect ? "bg-green-50 text-green-700" : hasAnswer ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"}`}>
                          {hasAnswer ? submission.answer : "未作答"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-1 text-muted-foreground">
                          正確答案：
                        </div>
                        <div className="text-sm p-2 rounded bg-blue-50 text-blue-700">
                          {submission.question?.correctAnswer}
                        </div>
                      </div>
                    </div>

                    {/* AI評分結果（問答題） */}
                    {aiEvaluation && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <span className="font-semibold text-purple-900">AI評分建議</span>
                          <Badge variant="outline" className="ml-auto">
                            {aiEvaluation.score}/100
                          </Badge>
                        </div>
                        <div className="text-sm text-purple-800 mb-2">
                          <strong>評分理由：</strong>
                          {aiEvaluation.reasoning}
                        </div>
                        {aiEvaluation.suggestions && aiEvaluation.suggestions.length > 0 && (
                          <div className="text-sm text-purple-800">
                            <strong>改進建議：</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {aiEvaluation.suggestions.map((suggestion: string, i: number) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 題目解釋 */}
                    {submission.question?.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-semibold text-blue-900 mb-1">
                          題目解釋：
                        </div>
                        <div className="text-sm text-blue-800">
                          {submission.question.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 錯題分析 */}
        {wrongAnswers > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                錯題分析
              </CardTitle>
              <CardDescription>需要加強的知識點</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-red-900">答錯率</div>
                    <div className="text-sm text-red-700">
                      {totalQuestions > 0
                        ? ((wrongAnswers / totalQuestions) * 100).toFixed(1)
                        : 0}
                      % ({wrongAnswers}/{totalQuestions} 題)
                    </div>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>

                {!isPassed && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-yellow-900 mb-1">
                          學習建議
                        </div>
                        <div className="text-sm text-yellow-800">
                          建議複習錯題相關的知識點，並多加練習。可以參考每題的解釋和AI評分建議，針對性地加強學習。
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

