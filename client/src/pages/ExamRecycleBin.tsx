import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Trash2, FileText, Calendar, Clock, AlertTriangle, CheckSquare } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ExamRecycleBin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);

  // 查詢已刪除的考試列表
  const { data: deletedExams, isLoading, refetch } = trpc.exams.getDeleted.useQuery();

  // 恢復考試
  const restoreMutation = trpc.exams.restore.useMutation({
    onSuccess: () => {
      toast.success("考試已恢復");
      setSelectedExamIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`恢復失敗：${error.message}`);
    },
  });

  // 批次恢復考試
  const batchRestoreMutation = trpc.exams.batchRestore.useMutation({
    onSuccess: (data) => {
      toast.success(`已成功恢復 ${data.success} 個考試，失敗 ${data.failed} 個`);
      setSelectedExamIds([]);
      setShowRestoreDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`批次恢復失敗：${error.message}`);
    },
  });

  // 永久刪除考試
  const permanentDeleteMutation = trpc.exams.permanentDelete.useMutation({
    onSuccess: () => {
      toast.success("考試已永久刪除");
      setSelectedExamIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`永久刪除失敗：${error.message}`);
    },
  });

  // 批次永久刪除考試
  const batchPermanentDeleteMutation = trpc.exams.batchPermanentDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`已成功永久刪除 ${data.success} 個考試，失敗 ${data.failed} 個`);
      setSelectedExamIds([]);
      setShowPermanentDeleteDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`批次永久刪除失敗：${error.message}`);
    },
  });

  const toggleExamSelection = (examId: number) => {
    setSelectedExamIds(prev =>
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const toggleSelectAll = () => {
    if (!deletedExams) return;
    if (selectedExamIds.length === deletedExams.length) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(deletedExams.map(e => e.id));
    }
  };

  const handleBatchRestore = () => {
    if (selectedExamIds.length === 0) {
      toast.error("請至少選擇一個考試");
      return;
    }
    setShowRestoreDialog(true);
  };

  const handleBatchPermanentDelete = () => {
    if (selectedExamIds.length === 0) {
      toast.error("請至少選擇一個考試");
      return;
    }
    setShowPermanentDeleteDialog(true);
  };

  const confirmBatchRestore = () => {
    batchRestoreMutation.mutate(selectedExamIds);
  };

  const confirmBatchPermanentDelete = () => {
    batchPermanentDeleteMutation.mutate(selectedExamIds);
  };

  // 計算刪除後的剩餘天數
  const getDaysRemaining = (deletedAt: Date | string) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
      <div className="container max-w-7xl">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/exams/list")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回考試列表
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">考試回收站</h1>
              <p className="text-muted-foreground mt-1">已刪除的考試將保留 30 天，逾期後將自動永久刪除</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedExamIds.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBatchRestore}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  恢復已選 ({selectedExamIds.length})
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBatchPermanentDelete}
                  disabled={user?.role !== "admin"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  永久刪除 ({selectedExamIds.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 警告提示 */}
        <Card className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                ⚠️ 重要提示
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                • 已刪除的考試將在回收站保留 30 天，逾期後將自動永久刪除
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                • 恢復考試後，相關的考生指派、提交記錄和補考資料將一併恢復
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                • 永久刪除操作無法復原，請謹慎操作（僅管理員可執行）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 考試列表 */}
        {!deletedExams || deletedExams.length === 0 ? (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">回收站是空的</p>
              <p className="text-sm text-muted-foreground mt-2">目前沒有已刪除的考試</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-orange-900 dark:text-orange-100">已刪除的考試</CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                共 {deletedExams.length} 個考試
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={deletedExams.length > 0 && selectedExamIds.length === deletedExams.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>考試名稱</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>刪除時間</TableHead>
                    <TableHead>剩餘天數</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedExams.map((exam: any) => {
                    const isSelected = selectedExamIds.includes(exam.id);
                    const daysRemaining = getDaysRemaining(exam.deletedAt);
                    const isExpiringSoon = daysRemaining <= 7;

                    return (
                      <TableRow
                        key={exam.id}
                        className={isSelected ? "bg-orange-100 dark:bg-orange-950" : ""}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleExamSelection(exam.id)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>
                          <Badge variant={exam.status === "published" ? "default" : "secondary"}>
                            {exam.status === "draft" ? "草稿" : exam.status === "published" ? "已發布" : "已封存"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(exam.deletedAt).toLocaleString('zh-TW')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isExpiringSoon ? "destructive" : "outline"}
                            className={isExpiringSoon ? "animate-pulse" : ""}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {daysRemaining} 天
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedExamIds([exam.id]);
                                setShowRestoreDialog(true);
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              恢復
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedExamIds([exam.id]);
                                setShowPermanentDeleteDialog(true);
                              }}
                              disabled={user?.role !== "admin"}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              永久刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 恢復確認對話框 */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>確認恢復考試</DialogTitle>
              <DialogDescription>
                您即將恢復 {selectedExamIds.length} 個考試，恢復後考試將回到原來的狀態。
              </DialogDescription>
            </DialogHeader>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 提示：</strong>恢復後的考試將回到考試列表，相關的考生指派、提交記錄和補考資料將一併恢復。
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
              >
                取消
              </Button>
              <Button
                onClick={confirmBatchRestore}
                disabled={batchRestoreMutation.isPending}
              >
                {batchRestoreMutation.isPending ? "恢復中..." : "確認恢復"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 永久刪除確認對話框 */}
        <Dialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">確認永久刪除</DialogTitle>
              <DialogDescription>
                您即將永久刪除 {selectedExamIds.length} 個考試，此操作無法復原！
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-900 dark:text-red-100">
                <strong>⚠️ 警告：</strong>永久刪除後，考試及其相關的所有資料（考生指派、提交記錄、補考資料）將被完全清除，無法恢復。
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPermanentDeleteDialog(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBatchPermanentDelete}
                disabled={batchPermanentDeleteMutation.isPending}
              >
                {batchPermanentDeleteMutation.isPending ? "刪除中..." : "確認永久刪除"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

