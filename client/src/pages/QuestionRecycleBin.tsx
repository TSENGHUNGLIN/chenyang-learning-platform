import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trash2, RotateCcw, Home, AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type QuestionType = "true_false" | "multiple_choice" | "short_answer";
type Difficulty = "easy" | "medium" | "hard";

export default function QuestionRecycleBin() {
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(15);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const { user } = useAuth();
  const { data: deletedQuestions, refetch } = trpc.questions.listDeleted.useQuery();
  const restoreMutation = trpc.questions.restore.useMutation();
  const permanentDeleteMutation = trpc.questions.permanentDelete.useMutation();
  const batchRestoreMutation = trpc.questions.batchRestore.useMutation();
  const batchPermanentDeleteMutation = trpc.questions.batchPermanentDelete.useMutation();
  const cleanupMutation = trpc.questions.cleanupOldDeleted.useMutation();

  // 篩選題目
  const filteredQuestions = deletedQuestions?.filter((q: any) => {
    if (searchKeyword && !q.question.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    return true;
  });

  // 倒數計時
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPermanentDeleteDialog && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown(deleteCountdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showPermanentDeleteDialog, deleteCountdown]);

  // 切換選擇
  const toggleSelection = (id: number) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions?.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions?.map((q: any) => q.id) || []);
    }
  };

  // 單一還原
  const handleRestore = async (id: number) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success("題目已還原");
      refetch();
    } catch (error) {
      toast.error("還原失敗");
    }
  };

  // 批次還原
  const handleBatchRestore = async () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一個題目");
      return;
    }

    // 檢查權限：只有管理員可以批次還原
    if (!user || user.role !== 'admin') {
      toast.error("您沒有權限批次還原題目，只有管理員可以批次還原");
      return;
    }

    try {
      await batchRestoreMutation.mutateAsync(selectedQuestions);
      toast.success(`成功還原 ${selectedQuestions.length} 個題目`);
      setSelectedQuestions([]);
      refetch();
    } catch (error) {
      toast.error("批次還原失敗");
    }
  };

  // 開啟永久刪除確認對話框
  const openPermanentDeleteDialog = () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一個題目");
      return;
    }

    // 檢查權限：只有管理員可以批次永久刪除
    if (!user || user.role !== 'admin') {
      toast.error("您沒有權限批次永久刪除題目，只有管理員可以批次永久刪除");
      return;
    }

    setDeleteCountdown(15);
    setShowPermanentDeleteDialog(true);
  };

  // 執行永久刪除
  const confirmPermanentDelete = async () => {
    setIsDeleting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const questionId of selectedQuestions) {
        try {
          await permanentDeleteMutation.mutateAsync(questionId);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`永久刪除題目 ${questionId} 失敗:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`成功永久刪除 ${successCount} 個題目${failCount > 0 ? `，${failCount} 個失敗` : ''}`);
      } else {
        toast.error("永久刪除失敗，請稍後再試");
      }

      setSelectedQuestions([]);
      setShowPermanentDeleteDialog(false);
      refetch();
    } catch (error) {
      toast.error("永久刪除失敗，請稍後再試");
    } finally {
      setIsDeleting(false);
    }
  };

  // 取消永久刪除
  const cancelPermanentDelete = () => {
    setShowPermanentDeleteDialog(false);
    setDeleteCountdown(15);
    toast.info("已取消永久刪除操作");
  };

  // 自動清理30天前的題目
  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await cleanupMutation.mutateAsync();
      toast.success(`成功清理 ${result.count} 個30天前刪除的題目`);
      setShowCleanupDialog(false);
      refetch();
    } catch (error) {
      toast.error("自動清理失敗");
    } finally {
      setIsCleaning(false);
    }
  };

  // 題型標籤
  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case "true_false": return "是非題";
      case "multiple_choice": return "選擇題";
      case "short_answer": return "問答題";
      default: return type;
    }
  };

  // 難度標籤
  const getDifficultyLabel = (difficulty: Difficulty) => {
    switch (difficulty) {
      case "easy": return "簡單";
      case "medium": return "中等";
      case "hard": return "困難";
      default: return difficulty;
    }
  };

  // 難度顏色
  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "";
    }
  };

  // 格式化時間
  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 計算刪除天數
  const getDaysSinceDeleted = (deletedAt: any) => {
    if (!deletedAt) return 0;
    const now = new Date();
    const deleted = new Date(deletedAt);
    const diffTime = Math.abs(now.getTime() - deleted.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="h-8 w-8" />
            題目回收站
          </h1>
          <p className="text-muted-foreground mt-2">
            已刪除的題目將保留30天，之後自動永久刪除
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          <Home className="h-4 w-4 mr-2" />
          返回首頁
        </Button>
      </div>

      {/* 主要內容 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>回收站題目列表</CardTitle>
              <CardDescription>
                共 {filteredQuestions?.length || 0} 個已刪除的題目
                {selectedQuestions.length > 0 && (
                  <span className="ml-4 text-primary font-semibold">
                    已選擇 {selectedQuestions.length} 題
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedQuestions.length > 0 && user?.role === 'admin' && (
                <>
                  {/* 只有管理員可以批次還原和永久刪除 */}
                  <Button onClick={handleBatchRestore} variant="default">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    批次還原 ({selectedQuestions.length})
                  </Button>
                  <Button 
                    onClick={openPermanentDeleteDialog} 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    永久刪除 ({selectedQuestions.length})
                  </Button>
                </>
              )}
              {user?.role === 'admin' && (
                <Button 
                  onClick={() => setShowCleanupDialog(true)} 
                  variant="outline"
                >
                  自動清理
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜尋欄位 */}
          <div className="mb-6">
            <Label>搜尋題目</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="輸入關鍵字..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 題目表格 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.length === filteredQuestions?.length && filteredQuestions?.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4"
                  />
                </TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead>題目</TableHead>
                <TableHead className="w-24">類型</TableHead>
                <TableHead className="w-24">難度</TableHead>
                <TableHead className="w-32">刪除時間</TableHead>
                <TableHead className="w-24">刪除天數</TableHead>
                <TableHead className="w-24">刪除者</TableHead>
                <TableHead className="w-32 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions?.map((question: any, index: number) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => toggleSelection(question.id)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={question.question}>
                      {question.question}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {getDifficultyLabel(question.difficulty)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(question.deletedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getDaysSinceDeleted(question.deletedAt) >= 25 ? "destructive" : "secondary"}>
                      {getDaysSinceDeleted(question.deletedAt)} 天
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {question.deleterName || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(question.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        還原
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredQuestions || filteredQuestions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    回收站是空的
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 永久刪除確認對話框（15秒緩衝期） */}
      <Dialog open={showPermanentDeleteDialog} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          cancelPermanentDelete();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              確認永久刪除
            </DialogTitle>
            <DialogDescription>
              此操作無法復原，題目將從資料庫中永久移除
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="text-sm space-y-2">
                <p className="font-semibold text-destructive">
                  您即將永久刪除 {selectedQuestions.length} 個題目
                </p>
                <p className="text-muted-foreground">
                  永久刪除後，這些題目將無法恢復，請謹慎操作。
                </p>
              </div>
            </div>

            {deleteCountdown > 0 && (
              <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-5xl font-bold text-destructive mb-2">
                    {deleteCountdown}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    秒後可以確認刪除
                  </div>
                </div>
              </div>
            )}

            {deleteCountdown === 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 text-center">
                  ✓ 現在可以執行永久刪除操作
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={cancelPermanentDelete}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmPermanentDelete}
              disabled={deleteCountdown > 0 || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  刪除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  確認永久刪除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 自動清理確認對話框 */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>自動清理30天前刪除的題目</DialogTitle>
            <DialogDescription>
              此操作將永久刪除所有30天前刪除的題目
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ 此操作無法復原，請確認後再執行
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCleanup} disabled={isCleaning}>
              {isCleaning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  清理中...
                </>
              ) : (
                "確認清理"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

