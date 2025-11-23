import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ManualGrading() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const assignmentId = params.assignmentId ? parseInt(params.assignmentId) : 0;

  // 狀態管理
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 取得考試指派資訊
  const { data: assignment, isLoading: assignmentLoading } = trpc.exams.getAssignment.useQuery(assignmentId);

  // 取得考試題目和答案
  const { data: submissions, isLoading: submissionsLoading, refetch } = trpc.exams.getSubmissions.useQuery(assignmentId);

  // 取得考試資訊
  const { data: exam, isLoading: examLoading } = trpc.exams.getById.useQuery(
    assignment?.examId || 0,
    { enabled: !!assignment }
  );

  // 更新分數mutation
  const updateScoreMutation = trpc.exams.updateManualScore.useMutation();

  // 初始化分數和評語
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      const initialScores: Record<number, number> = {};
      const initialComments: Record<number, string> = {};
      
      submissions.forEach((sub: any) => {
        initialScores[sub.id] = sub.score || 0;
        initialComments[sub.id] = sub.teacherComment || "";
      });
      
      setScores(initialScores);
      setComments(initialComments);
    }
  }, [submissions]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // 處理分數變更
  const handleScoreChange = (submissionId: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setScores(prev => ({ ...prev, [submissionId]: numValue }));
    }
  };

  // 處理評語變更
  const handleCommentChange = (submissionId: number, value: string) => {
    setComments(prev => ({ ...prev, [submissionId]: value }));
  };

  // 儲存評分
  const handleSave = async () => {
    if (!submissions) return;

    setIsSaving(true);
    try {
      // 批次更新所有題目的分數和評語
      await Promise.all(
        submissions.map((sub: any) =>
          updateScoreMutation.mutateAsync({
            submissionId: sub.id,
            score: scores[sub.id] || 0,
            teacherComment: comments[sub.id] || "",
          })
        )
      );

      toast.success("評分已儲存！");
      refetch();
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || assignmentLoading || submissionsLoading || examLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入評分資料中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment || !exam || !submissions) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>找不到評分資料</CardTitle>
              <CardDescription>無法載入考試評分資訊</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/exams")} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回考試管理
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // 計算總分
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const maxScore = exam.totalScore || 100;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 頁首 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">人工評分</h1>
            <p className="text-muted-foreground mt-2">
              {exam.title} - 考生：{assignment.user?.name || "未知"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/exam/${exam.id}/statistics`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回統計
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "儲存中..." : "儲存評分"}
            </Button>
          </div>
        </div>

        {/* 總分卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>評分總覽</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-bold text-primary mb-2">{totalScore}</div>
                <div className="text-sm text-muted-foreground">目前總分</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-bold mb-2">{maxScore}</div>
                <div className="text-sm text-muted-foreground">滿分</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-bold text-green-600 mb-2">{percentage}%</div>
                <div className="text-sm text-muted-foreground">百分比</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 題目評分 */}
        <div className="space-y-4">
          {submissions.map((submission: any, index: number) => {
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
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
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
                        <Badge variant="outline">{submission.question?.type}</Badge>
                      </div>
                      <div className="text-sm mb-3">{submission.question?.question}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 答案對比 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold mb-1 text-muted-foreground">
                        考生答案：
                      </div>
                      <div className={`text-sm p-3 rounded border ${isCorrect ? "bg-green-50 border-green-200" : hasAnswer ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                        {hasAnswer ? submission.answer : "未作答"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-1 text-muted-foreground">
                        正確答案：
                      </div>
                      <div className="text-sm p-3 rounded border bg-blue-50 border-blue-200">
                        {submission.question?.correctAnswer}
                      </div>
                    </div>
                  </div>

                  {/* AI評分結果 */}
                  {aiEvaluation && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
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

                  <Separator />

                  {/* 分數調整 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`score-${submission.id}`}>分數調整</Label>
                      <Input
                        id={`score-${submission.id}`}
                        type="number"
                        min="0"
                        max={submission.question?.score || 10}
                        value={scores[submission.id] || 0}
                        onChange={(e) => handleScoreChange(submission.id, e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        滿分：{submission.question?.score || 10} 分
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`comment-${submission.id}`}>教師評語</Label>
                      <Textarea
                        id={`comment-${submission.id}`}
                        value={comments[submission.id] || ""}
                        onChange={(e) => handleCommentChange(submission.id, e.target.value)}
                        placeholder="輸入評語或建議..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 底部儲存按鈕 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "儲存中..." : "儲存評分"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

