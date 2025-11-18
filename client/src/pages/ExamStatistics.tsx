import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Download,
  FileSpreadsheet,
  Edit,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useEffect } from "react";
import { toast } from "sonner";

export default function ExamStatistics() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const examId = params.id ? parseInt(params.id) : 0;

  // 取得考試統計資料
  const { data: statistics, isLoading: statsLoading } = trpc.exams.getStatistics.useQuery(examId);
  const { data: wrongAnswers, isLoading: wrongLoading } = trpc.exams.getWrongAnswerRanking.useQuery(examId);
  const { data: performance, isLoading: performanceLoading } =
    trpc.exams.getStudentPerformance.useQuery(examId);

  // 匯出Mutation
  const exportScoresMutation = trpc.exams.exportScores.useMutation();
  const exportStatisticsMutation = trpc.exams.exportStatistics.useMutation();

  // 處理匯出成績
  const handleExportScores = async () => {
    try {
      const result = await exportScoresMutation.mutateAsync(examId);
      // 將base64轉換為Blob並下載
      const blob = new Blob(
        [Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("成績報表已匯出！");
    } catch (error) {
      toast.error("匯出失敗，請稍後再試");
    }
  };

  // 處理匯出統計
  const handleExportStatistics = async () => {
    try {
      const result = await exportStatisticsMutation.mutateAsync(examId);
      // 將base64轉換為Blob並下載
      const blob = new Blob(
        [Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("統計分析已匯出！");
    } catch (error) {
      toast.error("匯出失敗，請稍後再試");
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || statsLoading || wrongLoading || perfLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入統計資料中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!statistics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>找不到統計資料</CardTitle>
              <CardDescription>無法載入考試統計資訊</CardDescription>
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

  const { exam, overview, scoreDistribution } = statistics;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 頁首 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{exam.title}</h1>
            <p className="text-muted-foreground mt-2">考試統計分析</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/exams")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回考試管理
            </Button>
            <Button
              variant="outline"
              onClick={handleExportScores}
              disabled={exportScoresMutation.isPending}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exportScoresMutation.isPending ? "匯出中..." : "匯出成績"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportStatistics}
              disabled={exportStatisticsMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportStatisticsMutation.isPending ? "匯出中..." : "匯出統計"}
            </Button>
          </div>      </div>

        {/* 總覽卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                總指派人數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{overview.totalAssignments}</div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                已完成：{overview.completedAssignments} / 進行中：{overview.inProgressAssignments}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                平均分數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{overview.averageScore}%</div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                最高：{overview.highestScore}% / 最低：{overview.lowestScore}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                及格率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{overview.passRate}%</div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                及格：{overview.passedCount} / 不及格：{overview.failedCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已評分人數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{overview.totalGraded}</div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
              <Progress
                value={(overview.totalGraded / overview.totalAssignments) * 100}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* 分數分布 */}
        <Card>
          <CardHeader>
            <CardTitle>分數分布</CardTitle>
            <CardDescription>各分數區間的人數統計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(scoreDistribution).map(([range, count]) => {
                const total = overview.totalGraded;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={range} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{range} 分</span>
                      <span className="text-sm text-muted-foreground">
                        {count} 人 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 錯題排行榜 */}
        {wrongAnswers && wrongAnswers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                錯題排行榜
              </CardTitle>
              <CardDescription>錯誤率最高的前10題</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">排名</TableHead>
                      <TableHead>題目</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>難度</TableHead>
                      <TableHead>作答人數</TableHead>
                      <TableHead>錯誤人數</TableHead>
                      <TableHead className="text-right">錯誤率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wrongAnswers.map((item, index) => (
                      <TableRow key={item.questionId}>
                        <TableCell className="font-bold">#{index + 1}</TableCell>
                        <TableCell className="max-w-md truncate">{item.question}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.difficulty === "hard"
                                ? "destructive"
                                : item.difficulty === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {item.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.totalAttempts}</TableCell>
                        <TableCell className="text-red-600">{item.wrongCount}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-red-600">{item.wrongRate}%</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 考生表現列表 */}
        {performance && performance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>考生表現</CardTitle>
              <CardDescription>所有考生的成績一覽</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>得分</TableHead>
                      <TableHead>百分比</TableHead>
                      <TableHead>結果</TableHead>
                      <TableHead>評分時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance.map((item, index) => (
                      <TableRow key={item.assignmentId}>
                        <TableCell className="font-bold">#{index + 1}</TableCell>
                        <TableCell>{item.userName || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.userEmail || "-"}
                        </TableCell>
                        <TableCell>
                          {item.status === "graded" ? (
                            <Badge variant="default" className="bg-purple-500">
                              已評分
                            </Badge>
                          ) : item.status === "submitted" ? (
                            <Badge variant="default" className="bg-green-500">
                              已提交
                            </Badge>
                          ) : item.status === "in_progress" ? (
                            <Badge variant="default" className="bg-blue-500">
                              進行中
                            </Badge>
                          ) : (
                            <Badge variant="secondary">待考</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.totalScore !== null ? `${item.totalScore}/${item.maxScore}` : "-"}
                        </TableCell>
                        <TableCell>
                          {item.percentage !== null ? (
                            <span className="font-semibold">{item.percentage}%</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {item.passed === 1 ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              及格
                            </Badge>
                          ) : item.passed === 0 ? (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              不及格
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.gradedAt
                            ? new Date(item.gradedAt).toLocaleString("zh-TW")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {(item.status === "submitted" || item.status === "graded") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/exam/${item.assignmentId}/grade`)}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              評分
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

