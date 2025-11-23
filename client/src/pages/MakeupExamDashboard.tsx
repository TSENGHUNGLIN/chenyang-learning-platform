import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MakeupExamDashboard() {
  const [, setLocation] = useLocation();
  const { data: myHistory, isLoading: loadingHistory } = trpc.makeupExams.getHistory.useQuery();

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 計算統計數據
  const totalMakeups = myHistory?.length || 0;
  const completedMakeups = myHistory?.filter((item: any) => item.makeupExam.status === "completed").length || 0;
  const pendingCount = myHistory?.filter((item: any) => item.makeupExam.status === "pending").length || 0;
  const scheduledMakeups = myHistory?.filter((item: any) => item.makeupExam.status === "scheduled").length || 0;

  // 計算補考通過率
  const passedMakeups = myHistory?.filter(
    (item: any) =>
      item.makeupExam.status === "completed" &&
      item.makeupExam.makeupScore !== null &&
      item.makeupExam.makeupScore >= (item.makeupExam.originalScore || 0) * 1.5
  ).length || 0;

  const passRate = completedMakeups > 0 ? ((passedMakeups / completedMakeups) * 100).toFixed(1) : "0.0";

  const stats = [
    {
      title: "總補考次數",
      value: totalMakeups,
      icon: Clock,
      description: "歷史補考記錄",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "待安排",
      value: pendingCount,
      icon: AlertCircle,
      description: "等待管理員安排",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "已安排",
      value: scheduledMakeups,
      icon: Clock,
      description: "補考進行中",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "已完成",
      value: completedMakeups,
      icon: CheckCircle2,
      description: "補考已完成",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "待安排", className: "bg-yellow-100 text-yellow-800" },
      scheduled: { label: "已安排", className: "bg-blue-100 text-blue-800" },
      completed: { label: "已完成", className: "bg-green-100 text-green-800" },
      expired: { label: "已過期", className: "bg-red-100 text-red-800" },
    };

    const statusInfo = statusMap[status] || statusMap.pending;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">補考進度追蹤</h1>
          <p className="text-muted-foreground mt-2">查看您的補考記錄和進度</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <Home className="h-4 w-4 mr-2" />
          返回首頁
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 補考通過率卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {parseFloat(passRate) >= 60 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            補考通過率
          </CardTitle>
          <CardDescription>已完成補考的通過情況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-primary">{passRate}%</div>
            <div className="text-sm text-muted-foreground">
              <p>已完成：{completedMakeups} 次</p>
              <p>通過：{passedMakeups} 次</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                parseFloat(passRate) >= 60 ? "bg-green-600" : "bg-red-600"
              }`}
              style={{ width: `${passRate}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* 補考歷史記錄 */}
      <Card>
        <CardHeader>
          <CardTitle>補考歷史記錄</CardTitle>
          <CardDescription>查看所有補考記錄的詳細資訊</CardDescription>
        </CardHeader>
        <CardContent>
          {!myHistory || myHistory.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">您目前沒有補考記錄</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考試名稱</TableHead>
                  <TableHead>原始分數</TableHead>
                  <TableHead>補考分數</TableHead>
                  <TableHead>補考次數</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>建立時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myHistory.map((item: any) => (
                  <TableRow key={item.makeupExam.id}>
                    <TableCell className="font-medium">
                      {item.exam?.title || "未知考試"}
                    </TableCell>
                    <TableCell>
                      <span className="text-red-600 font-semibold">
                        {item.makeupExam.originalScore || 0} 分
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.makeupExam.makeupScore !== null ? (
                        <span
                          className={`font-semibold ${
                            item.makeupExam.makeupScore >= (item.makeupExam.originalScore || 0) * 1.5
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {item.makeupExam.makeupScore} 分
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未完成</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.makeupExam.makeupCount} / {item.makeupExam.maxMakeupAttempts}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.makeupExam.status)}</TableCell>
                    <TableCell>
                      {new Date(item.makeupExam.createdAt).toLocaleString("zh-TW")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

