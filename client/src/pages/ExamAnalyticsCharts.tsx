import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, TrendingUp, Target } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useEffect } from "react";
import ScoreTrendChart from "@/components/charts/ScoreTrendChart";
import ScoreDistributionChart from "@/components/charts/ScoreDistributionChart";
import AbilityRadarChart from "@/components/charts/AbilityRadarChart";

export default function ExamAnalyticsCharts() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const examId = params.id ? parseInt(params.id) : 0;

  // 取得考試統計資料
  const { data: statistics, isLoading: statsLoading } = trpc.exams.getStatistics.useQuery(examId);
  const { data: chartData, isLoading: chartLoading } = trpc.exams.getChartData.useQuery(examId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || statsLoading || chartLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入圖表資料中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!statistics || !chartData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>找不到資料</CardTitle>
              <CardDescription>無法載入圖表資訊</CardDescription>
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

  // 轉換分數分布資料為圖表格式
  const distributionData = Object.entries(scoreDistribution).map(([range, count]) => {
    const total = overview.totalGraded;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return {
      range,
      count,
      percentage
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 頁首 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{exam.title}</h1>
            <p className="text-muted-foreground mt-2">成績分析圖表</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/exams/${examId}/statistics`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回統計頁面
            </Button>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                平均分數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview.averageScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                最高 {overview.highestScore}% / 最低 {overview.lowestScore}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                及格率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview.passRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                及格 {overview.passedCount} 人 / 不及格 {overview.failedCount} 人
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                完成率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {((overview.completedAssignments / overview.totalAssignments) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.completedAssignments} / {overview.totalAssignments} 人完成
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 分數分布長條圖 */}
        <ScoreDistributionChart data={distributionData} />

        {/* 成績趨勢折線圖 */}
        {chartData.scoreTrend && chartData.scoreTrend.length > 0 && (
          <ScoreTrendChart 
            data={chartData.scoreTrend}
            title="歷次考試成績趨勢"
            description="追蹤考生在不同考試中的表現變化"
          />
        )}

        {/* 能力維度雷達圖 */}
        {chartData.abilityAnalysis && chartData.abilityAnalysis.length > 0 && (
          <AbilityRadarChart 
            data={chartData.abilityAnalysis}
            title="知識領域掌握度"
            description="各分類題目的平均得分率"
          />
        )}

        {/* 提示訊息 */}
        {(!chartData.scoreTrend || chartData.scoreTrend.length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                暫無足夠資料生成趨勢圖表，請等待更多考試資料累積
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
