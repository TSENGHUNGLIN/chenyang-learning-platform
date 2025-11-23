import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Clock, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function OverdueExams() {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [newDeadline, setNewDeadline] = useState<string>("");
  const [showExtendDialog, setShowExtendDialog] = useState(false);

  // 查詢逾期考試
  const { data: overdueExams, isLoading, refetch } = trpc.examPlanning.listOverdue.useQuery();

  // 標記逾期
  const markOverdueMutation = trpc.examPlanning.markOverdue.useMutation({
    onSuccess: () => {
      toast.success("已標記為逾期");
      refetch();
    },
    onError: (error) => {
      toast.error(`標記失敗：${error.message}`);
    },
  });

  // 延長截止時間
  const extendDeadlineMutation = trpc.examPlanning.extendDeadline.useMutation({
    onSuccess: () => {
      toast.success("截止時間已延長");
      setShowExtendDialog(false);
      setNewDeadline("");
      setSelectedAssignmentId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`延長失敗：${error.message}`);
    },
  });

  // 處理延長截止時間
  const handleExtendDeadline = () => {
    if (!selectedAssignmentId || !newDeadline) {
      toast.error("請選擇考試並設定新的截止時間");
      return;
    }

    extendDeadlineMutation.mutate({
      assignmentId: selectedAssignmentId,
      newDeadline,
    });
  };

  // 計算逾期天數
  const calculateOverdueDays = (deadline: Date | string | null) => {
    if (!deadline) return 0;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = now.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            逾期考試管理
          </h1>
          <p className="text-muted-foreground mt-2">
            管理已超過截止時間但尚未提交的考試
          </p>
        </div>

        <Button onClick={() => refetch()} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          重新整理
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              逾期考試總數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueExams?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              嚴重逾期（超過7天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {overdueExams?.filter(e => {
                const days = calculateOverdueDays(e.assignment?.deadline || null);
                return days > 7;
              }).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              輕微逾期（1-7天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {overdueExams?.filter(e => {
                const days = calculateOverdueDays(e.assignment?.deadline || null);
                return days >= 1 && days <= 7;
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 逾期考試列表 */}
      <Card>
        <CardHeader>
          <CardTitle>逾期考試列表</CardTitle>
          <CardDescription>
            以下考試已超過截止時間但尚未提交
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!overdueExams || overdueExams.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">沒有逾期考試</h3>
              <p className="text-muted-foreground">所有考試都在期限內完成</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>考生</TableHead>
                    <TableHead>考試名稱</TableHead>
                    <TableHead>截止時間</TableHead>
                    <TableHead>逾期天數</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueExams.map((item) => {
                    const overdueDays = calculateOverdueDays(item.assignment?.deadline || null);
                    const isSevere = overdueDays > 7;

                    return (
                      <TableRow key={item.assignment?.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.user?.name || "未命名"}</p>
                            <p className="text-xs text-muted-foreground">{item.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{item.exam?.title}</p>
                        </TableCell>
                        <TableCell>
                          {item.assignment?.deadline ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {format(new Date(item.assignment.deadline), "yyyy/MM/dd HH:mm", { locale: zhTW })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">無截止時間</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isSevere ? "destructive" : "secondary"}>
                            逾期 {overdueDays} 天
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.assignment?.status === "pending" ? "待考" : "進行中"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAssignmentId(item.assignment?.id || null);
                                setShowExtendDialog(true);
                              }}
                            >
                              延長期限
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (item.assignment?.id) {
                                  markOverdueMutation.mutate(item.assignment.id);
                                }
                              }}
                              disabled={markOverdueMutation.isPending}
                            >
                              標記逾期
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 延長截止時間對話框 */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>延長截止時間</DialogTitle>
            <DialogDescription>
              設定新的截止時間以延長考試期限
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-deadline">新截止時間</Label>
              <Input
                id="new-deadline"
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtendDialog(false);
                  setNewDeadline("");
                  setSelectedAssignmentId(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleExtendDeadline}
                disabled={extendDeadlineMutation.isPending || !newDeadline}
              >
                {extendDeadlineMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                確認延長
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

