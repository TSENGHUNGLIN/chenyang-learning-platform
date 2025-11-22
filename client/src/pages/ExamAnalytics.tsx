import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Users, Award, Clock, AlertCircle, Home } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export default function ExamAnalytics() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const examId = params.examId ? parseInt(params.examId) : 0;

  // 查詢成績分析資料
  const { data: analytics, isLoading } = trpc.exams.getAnalytics.useQuery(examId);
  const { data: rankings } = trpc.exams.getStudentRankings.useQuery(examId);

  // 匯出分析報告
  const exportMutation = trpc.exams.exportStatistics.useMutation({
    onSuccess: (result) => {
      // 將base64轉換為Blob並下載
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("分析報告已匯出");
    },
    onError: (error) => {
      toast.error(error.message || "匯出失敗");
    },
  });

  const handleExport = () => {
    exportMutation.mutate(examId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入分析資料中...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            無法載入成績分析資料，請稍後再試。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { 
    exam, 
    statistics = { totalStudents: 0, averageScore: 0, passedCount: 0, passRate: 0 }, 
    scoreDistribution = [], 
    answerTimeStats = { averageDuration: 0, fastestDuration: 0, slowestDuration: 0 }, 
    wrongAnswers = [], 
    studentScores = [] 
  } = analytics || {};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-7xl">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/exams')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{exam?.title || '考試分析'}</h1>
              <p className="text-muted-foreground">成績分析報表</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              返回首頁
            </Button>
            <Button onClick={handleExport} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? "匯出中..." : "匯出報告"}
            </Button>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總考生數</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                已完成考試的考生人數
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均分數</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.averageScore.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                所有考生的平均得分
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">及格率</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.passRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {statistics.passedCount} / {statistics.totalStudents} 人及格
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均作答時間</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{answerTimeStats.averageDuration.toFixed(1)} 分</div>
              <p className="text-xs text-muted-foreground">
                最快 {answerTimeStats.fastestDuration.toFixed(1)} 分 / 最慢 {answerTimeStats.slowestDuration.toFixed(1)} 分
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 分頁內容 */}
        <Tabs defaultValue="distribution" className="space-y-4">
          <TabsList>
            <TabsTrigger value="distribution">分數分布</TabsTrigger>
            <TabsTrigger value="wrong-answers">錯題分析</TabsTrigger>
            <TabsTrigger value="rankings">考生排名</TabsTrigger>
          </TabsList>

          {/* 分數分布 */}
          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>分數分布圖</CardTitle>
                <CardDescription>顯示各分數區間的考生人數分布</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="考生人數" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>分數分布表</CardTitle>
                <CardDescription>詳細的分數區間統計</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>分數區間</TableHead>
                      <TableHead>考生人數</TableHead>
                      <TableHead>百分比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scoreDistribution.map((item) => (
                      <TableRow key={item.range}>
                        <TableCell className="font-medium">{item.range}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>{item.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 錯題分析 */}
          <TabsContent value="wrong-answers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>錯誤率最高的題目 TOP 10</CardTitle>
                <CardDescription>找出學生最容易答錯的題目</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">題目</TableHead>
                      <TableHead>題型</TableHead>
                      <TableHead>作答人數</TableHead>
                      <TableHead>答錯人數</TableHead>
                      <TableHead>錯誤率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wrongAnswers.map((item: any) => (
                      <TableRow key={item.questionId}>
                        <TableCell className="max-w-md truncate">{item.question}</TableCell>
                        <TableCell>
                          {item.questionType === 'true_false' && '是非題'}
                          {item.questionType === 'multiple_choice' && '選擇題'}
                          {item.questionType === 'short_answer' && '問答題'}
                        </TableCell>
                        <TableCell>{item.totalAttempts}</TableCell>
                        <TableCell>{item.wrongAttempts}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            item.errorRate > 50 ? 'text-red-500' : 
                            item.errorRate > 30 ? 'text-orange-500' : 
                            'text-yellow-500'
                          }`}>
                            {item.errorRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 考生排名 */}
          <TabsContent value="rankings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>考生排名列表</CardTitle>
                <CardDescription>按分數從高到低排序</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">排名</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>郵件</TableHead>
                      <TableHead>得分</TableHead>
                      <TableHead>總分</TableHead>
                      <TableHead>百分比</TableHead>
                      <TableHead>狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rankings || []).map((item: any, index: number) => (
                      <TableRow key={item.userId}>
                        <TableCell className="font-bold">
                          {index === 0 && <Award className="inline h-5 w-5 text-yellow-500 mr-1" />}
                          {index === 1 && <Award className="inline h-5 w-5 text-gray-400 mr-1" />}
                          {index === 2 && <Award className="inline h-5 w-5 text-orange-600 mr-1" />}
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{item.userName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.userEmail}</TableCell>
                        <TableCell className="font-semibold">{item.score}</TableCell>
                        <TableCell>{item.totalScore}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            item.percentage >= 80 ? 'text-green-500' : 
                            item.percentage >= 60 ? 'text-blue-500' : 
                            'text-red-500'
                          }`}>
                            {item.percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.isPassed ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              及格
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              不及格
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

