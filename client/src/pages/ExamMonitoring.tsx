import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Users, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * 考試監控儀表板
 * 管理員可即時監控所有考生的考試狀態、答題進度和系統效能
 */
export default function ExamMonitoring() {
  const { user, loading: authLoading } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5秒自動刷新

  // 獲取所有進行中的考試
  const { data: ongoingExams, isLoading: examsLoading, refetch: refetchExams } = trpc.exams.listOngoing.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // 獲取考試統計資料
  const { data: examStats, isLoading: statsLoading, refetch: refetchStats } = trpc.exams.getMonitoringStats.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // 手動刷新
  const handleManualRefresh = () => {
    refetchExams();
    refetchStats();
    toast.success("已刷新資料");
  };

  // 檢查權限
  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              權限不足
            </CardTitle>
            <CardDescription>只有管理員可以訪問考試監控儀表板</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 標題和控制區 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">考試監控儀表板</h1>
          <p className="text-muted-foreground mt-1">即時監控所有考生的考試狀態和系統效能</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoRefresh" className="text-sm">
              自動刷新 ({refreshInterval / 1000}秒)
            </label>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            手動刷新
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">進行中考試</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{examStats?.ongoingCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">場考試正在進行</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">應考人數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{examStats?.totalExaminees || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">位考生正在作答</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{examStats?.completedCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">位考生已交卷</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均進度</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{examStats?.averageProgress || 0}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">所有考生平均答題進度</p>
          </CardContent>
        </Card>
      </div>

      {/* 進行中的考試列表 */}
      <Card>
        <CardHeader>
          <CardTitle>進行中的考試</CardTitle>
          <CardDescription>即時監控每場考試的詳細狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {examsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : ongoingExams && ongoingExams.length > 0 ? (
            <div className="space-y-4">
              {ongoingExams.map((exam: any) => (
                <Card key={exam.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {exam.description || "無描述"}
                        </CardDescription>
                      </div>
                      <Badge variant={exam.status === "in_progress" ? "default" : "secondary"}>
                        {exam.status === "in_progress" ? "進行中" : exam.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">開始時間</p>
                        <p className="font-medium">
                          {exam.startTime ? new Date(exam.startTime).toLocaleString("zh-TW") : "未設定"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">結束時間</p>
                        <p className="font-medium">
                          {exam.endTime ? new Date(exam.endTime).toLocaleString("zh-TW") : "未設定"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">應考人數</p>
                        <p className="font-medium">{exam.totalExaminees || 0} 人</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">完成人數</p>
                        <p className="font-medium text-green-600">
                          {exam.completedCount || 0} 人
                        </p>
                      </div>
                    </div>

                    {/* 進度條 */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">整體進度</span>
                        <span className="font-medium">
                          {exam.completionRate || 0}% 完成
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${exam.completionRate || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* 考生列表（可展開） */}
                    {exam.examinees && exam.examinees.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                          查看考生詳情 ({exam.examinees.length} 人)
                        </summary>
                        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                          {exam.examinees.map((examinee: any) => (
                            <div
                              key={examinee.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">{examinee.name}</p>
                                  <p className="text-xs text-muted-foreground">{examinee.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {examinee.progress || 0}% 完成
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {examinee.answeredCount || 0}/{examinee.totalQuestions || 0} 題
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    examinee.status === "completed"
                                      ? "default"
                                      : examinee.status === "in_progress"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {examinee.status === "completed"
                                    ? "已完成"
                                    : examinee.status === "in_progress"
                                    ? "作答中"
                                    : "未開始"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>目前沒有進行中的考試</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 系統效能監控（預留） */}
      <Card>
        <CardHeader>
          <CardTitle>系統效能監控</CardTitle>
          <CardDescription>監控系統資源使用情況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">資料庫連線</p>
              <p className="text-2xl font-bold text-green-600">正常</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">API回應時間</p>
              <div className="text-2xl font-bold">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : `${examStats?.avgResponseTime || 0}ms`}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">同時在線人數</p>
              <div className="text-2xl font-bold">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : examStats?.totalExaminees || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

