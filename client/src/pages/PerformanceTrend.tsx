import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Award, Target, BarChart3, AlertCircle, Home } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";

export default function PerformanceTrend() {
  const [timeRange, setTimeRange] = useState<number | undefined>(30); // 預設30天
  const [isPractice, setIsPractice] = useState<boolean | undefined>(undefined); // 預設全部

  // 查詢成績趨勢資料
  const { data: trendData, isLoading: trendLoading } = trpc.performanceTrend.trend.useQuery({
    days: timeRange,
    isPractice,
  });

  // 查詢成績統計摘要
  const { data: stats, isLoading: statsLoading } = trpc.performanceTrend.stats.useQuery({
    days: timeRange,
    isPractice,
  });

  // 查詢成績分布
  const { data: distribution, isLoading: distributionLoading } = trpc.performanceTrend.distribution.useQuery({
    days: timeRange,
    isPractice,
  });

  // 準備折線圖資料
  const lineChartData = trendData?.map((item: any, index: number) => ({
    name: `第${index + 1}次`,
    date: new Date(item.submittedAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
    score: item.score,
    examTitle: item.examTitle,
  })) || [];

  // 準備長條圖資料（成績分布）
  const barChartData = [
    { range: "0-59", count: 0 },
    { range: "60-69", count: 0 },
    { range: "70-79", count: 0 },
    { range: "80-89", count: 0 },
    { range: "90-100", count: 0 },
  ];

  distribution?.forEach((item: any) => {
    const index = barChartData.findIndex((d) => d.range === item.scoreRange);
    if (index !== -1) {
      barChartData[index].count = item.count;
    }
  });

  const isLoading = trendLoading || statsLoading || distributionLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TrendingUp className="h-8 w-8" />
              成績趋勢分析
            </h1>
            <p className="text-muted-foreground mt-2">
              追蹤您的學習進步曲線，了解成績變化趋勢
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
          >
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </div>

        {/* 篩選器 */}
        <div className="flex items-center gap-4">
          <Select value={timeRange?.toString() || "all"} onValueChange={(value) => setTimeRange(value === "all" ? undefined : parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="選擇時間範圍" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部時間</SelectItem>
              <SelectItem value="7">最近 7 天</SelectItem>
              <SelectItem value="30">最近 30 天</SelectItem>
              <SelectItem value="90">最近 90 天</SelectItem>
            </SelectContent>
          </Select>

          <Select value={isPractice === undefined ? "all" : isPractice ? "practice" : "formal"} onValueChange={(value) => setIsPractice(value === "all" ? undefined : value === "practice")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="選擇考試類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部考試</SelectItem>
              <SelectItem value="formal">正式考試</SelectItem>
              <SelectItem value="practice">模擬練習</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 統計卡片 */}
        {stats && stats.totalExams > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>總考試次數</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalExams}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>平均分數</CardDescription>
                  <CardTitle className="text-3xl text-blue-500">{stats.avgScore}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>及格率</CardDescription>
                  <CardTitle className="text-3xl text-green-500">{stats.passRate}%</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>進步幅度</CardDescription>
                  <CardTitle className={`text-3xl flex items-center gap-2 ${stats.improvement >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {stats.improvement >= 0 ? (
                      <>
                        <TrendingUp className="h-6 w-6" />
                        +{stats.improvement}
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-6 w-6" />
                        {stats.improvement}
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* 成績趨勢折線圖 */}
            {lineChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    成績趨勢圖
                  </CardTitle>
                  <CardDescription>
                    顯示您的成績變化趨勢，幫助了解學習進步情況
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg">
                                <p className="font-semibold">{payload[0].payload.examTitle}</p>
                                <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                                <p className="text-lg font-bold text-primary mt-1">
                                  分數：{payload[0].value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="分數" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 成績分布長條圖 */}
            {barChartData.some((d) => d.count > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    成績分布圖
                  </CardTitle>
                  <CardDescription>
                    顯示您的成績分布情況，了解強項和弱項
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="次數" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 詳細成績列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  詳細成績記錄
                </CardTitle>
                <CardDescription>
                  查看每次考試的詳細成績
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendData?.map((item: any, index: number) => (
                    <div key={item.scoreId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <h4 className="font-semibold">{item.examTitle}</h4>
                          {item.isPractice === 1 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              <Target className="h-3 w-3 inline mr-1" />
                              模擬練習
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(item.submittedAt).toLocaleString("zh-TW")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${item.score >= item.passingScore ? "text-green-500" : "text-red-500"}`}>
                          {item.score}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          / {item.totalScore}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              目前沒有成績記錄，完成考試後即可查看成績趨勢分析。
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}

