import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, Award, FileText, Home } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function MyScores() {
  const [, setLocation] = useLocation();
  const { data: scores, isLoading } = trpc.scores.myScores.useQuery();

  // 計算統計資料
  const stats = scores ? {
    totalExams: scores.length,
    passedExams: scores.filter(s => s.passed === 1).length,
    avgScore: scores.length > 0 
      ? Math.round(scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length) 
      : 0,
    bestScore: scores.length > 0 
      ? Math.max(...scores.map(s => s.percentage)) 
      : 0,
  } : null;

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">我的考試成績</h1>
            <p className="text-muted-foreground">查看您的所有考試成績與統計資料</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <Home className="mr-2 h-4 w-4" />
            返回首頁
          </Button>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>總考試次數</CardDescription>
                <CardTitle className="text-3xl">{stats.totalExams}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  已完成考試
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>及格次數</CardDescription>
                <CardTitle className="text-3xl text-green-600">{stats.passedExams}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Award className="mr-2 h-4 w-4" />
                  及格率 {stats.totalExams > 0 ? Math.round((stats.passedExams / stats.totalExams) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>平均分數</CardDescription>
                <CardTitle className="text-3xl">{stats.avgScore}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  整體表現
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>最高分數</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{stats.bestScore}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Award className="mr-2 h-4 w-4" />
                  最佳成績
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 成績列表 */}
        <Card>
          <CardHeader>
            <CardTitle>考試成績記錄</CardTitle>
            <CardDescription>您的所有考試成績，依時間排序</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !scores || scores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>尚無考試成績記錄</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>考試名稱</TableHead>
                      <TableHead className="text-center">得分</TableHead>
                      <TableHead className="text-center">百分比</TableHead>
                      <TableHead className="text-center">狀態</TableHead>
                      <TableHead>評分時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score) => (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium">{score.examTitle}</TableCell>
                        <TableCell className="text-center">
                          {score.totalScore} / {score.maxScore}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${score.percentage >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                            {score.percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {score.passed === 1 ? (
                            <Badge variant="default" className="bg-green-600">
                              <Award className="mr-1 h-3 w-3" />
                              及格
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <TrendingDown className="mr-1 h-3 w-3" />
                              不及格
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(score.gradedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/exam/${score.examId}/result/${score.assignmentId}`)}
                          >
                            查看詳情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

