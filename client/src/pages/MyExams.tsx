import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, CheckCircle2, AlertCircle, PlayCircle, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function MyExams() {
  const [, setLocation] = useLocation();
  
  // 查詢我的考試指派
  const { data: assignments, isLoading } = trpc.exams.myAssignments.useQuery();

  // 格式化日期
  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 格式化時間
  const formatDateTime = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 取得狀態徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">待考</Badge>;
      case "in_progress":
        return <Badge variant="default" className="bg-blue-500">進行中</Badge>;
      case "submitted":
        return <Badge variant="default" className="bg-green-500">已提交</Badge>;
      case "graded":
        return <Badge variant="default" className="bg-purple-500">已評分</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 開始考試
  const handleStartExam = (examId: number) => {
    setLocation(`/exam/${examId}/take`);
  };

  // 查看成績
  const handleViewResult = (assignmentId: number) => {
    setLocation(`/exam/${assignmentId}/result`);
  };

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
        <div>
          <h1 className="text-3xl font-bold">考試園地</h1>
          <p className="text-muted-foreground mt-2">
            查看所有指派給您的考試，開始作答或查看成績
          </p>
        </div>

        {(!assignments || assignments.length === 0) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              目前沒有指派給您的考試。
            </AlertDescription>
          </Alert>
        )}

        {assignments && assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>考試列表</CardTitle>
              <CardDescription>
                共 {assignments.length} 個考試
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>考試名稱</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>時長</TableHead>
                      <TableHead>及格分數</TableHead>
                      <TableHead>指派時間</TableHead>
                      <TableHead>截止時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((item: any) => {
                      const { assignment, exam } = item;
                      if (!exam) return null;

                      return (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {exam.title}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(assignment.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {exam.timeLimit ? `${exam.timeLimit} 分鐘` : "不限時"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {exam.passingScore} 分
                          </TableCell>
                          <TableCell>
                            {formatDate(assignment.assignedAt)}
                          </TableCell>
                          <TableCell>
                            {assignment.deadline ? (
                              <span className={
                                new Date(assignment.deadline) < new Date()
                                  ? "text-red-500"
                                  : ""
                              }>
                                {formatDateTime(assignment.deadline)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(assignment.status === "pending" || assignment.status === "in_progress") && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartExam(exam.id)}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  {assignment.status === "in_progress" ? "繼續考試" : "開始考試"}
                                </Button>
                              )}
                              {(assignment.status === "submitted" || assignment.status === "graded") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewResult(assignment.id)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  查看成績
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

