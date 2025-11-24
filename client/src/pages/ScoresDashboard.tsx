import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, Award, Users, Home, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ScoresDashboard() {
  const [, setLocation] = useLocation();
  const [selectedExamId, setSelectedExamId] = useState<number | undefined>(undefined);

  // 查詢所有考試（用於下拉選單）
  const { data: exams } = trpc.exams.list.useQuery();
  
  // 查詢成績統計
  const { data: statistics, isLoading: statsLoading } = trpc.scores.statistics.useQuery(
    selectedExamId ? { examId: selectedExamId } : undefined
  );
  
  // 查詢成績排名
  const { data: rankings, isLoading: rankingsLoading } = trpc.scores.rankings.useQuery(
    selectedExamId ? { examId: selectedExamId, limit: 10 } : { limit: 10 }
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">成績統計儀表板</h1>
            <p className="text-muted-foreground">查看所有考生的成績統計與排名資料</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <Home className="mr-2 h-4 w-4" />
            返回首頁
          </Button>
        </div>

        {/* 考試篩選 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>篩選條件</CardTitle>
            <CardDescription>選擇特定考試查看成績統計，或查看所有考試的整體統計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">選擇考試：</label>
              <Select
                value={selectedExamId?.toString() || "all"}
                onValueChange={(value) => setSelectedExamId(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="所有考試" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有考試</SelectItem>
                  {exams?.filter(e => e.status === "published").map((exam) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 統計卡片 */}
        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : statistics ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>總考試次數</CardDescription>
                  <CardTitle className="text-3xl">{statistics.totalExams}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    已完成
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>平均分數</CardDescription>
                  <CardTitle className="text-3xl">{statistics.avgScore}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    整體表現
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>最高分數</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{statistics.maxScore}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    最佳成績
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>最低分數</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">{statistics.minScore}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TrendingDown className="mr-2 h-4 w-4" />
                    需加強
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>及格人數</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{statistics.passCount}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Award className="mr-2 h-4 w-4" />
                    通過考試
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>及格率</CardDescription>
                  <CardTitle className="text-3xl">{statistics.passRate}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    通過率
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 成績排名 */}
            <Card>
              <CardHeader>
                <CardTitle>成績排名 Top 10</CardTitle>
                <CardDescription>依百分比分數排序的前10名考生</CardDescription>
              </CardHeader>
              <CardContent>
                {rankingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !rankings || rankings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>尚無成績記錄</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">排名</TableHead>
                          <TableHead>考生姓名</TableHead>
                          <TableHead>考試名稱</TableHead>
                          <TableHead className="text-center">得分</TableHead>
                          <TableHead className="text-center">百分比</TableHead>
                          <TableHead className="text-center">狀態</TableHead>
                          <TableHead>評分時間</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankings.map((rank, index) => (
                          <TableRow key={`${rank.userId}-${rank.examId}-${rank.gradedAt}`}>
                            <TableCell className="text-center font-bold">
                              {index === 0 && <span className="text-yellow-600">🥇</span>}
                              {index === 1 && <span className="text-gray-400">🥈</span>}
                              {index === 2 && <span className="text-orange-600">🥉</span>}
                              {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                            </TableCell>
                            <TableCell className="font-medium">{rank.userName || "未知"}</TableCell>
                            <TableCell>{rank.examTitle}</TableCell>
                            <TableCell className="text-center">
                              {rank.totalScore} / {rank.maxScore}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${rank.percentage >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                {rank.percentage}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {rank.passed === 1 ? (
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
                            <TableCell>
                              {rank.gradedAt ? new Date(rank.gradedAt).toLocaleDateString("zh-TW") : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>尚無成績統計資料</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

