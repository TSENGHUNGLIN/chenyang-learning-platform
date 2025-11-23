import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, FileCheck, RefreshCcw, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ExamDeletionImpactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examIds: number[];
  onConfirm: () => void;
  isBatch?: boolean;
}

export default function ExamDeletionImpactDialog({
  open,
  onOpenChange,
  examIds,
  onConfirm,
  isBatch = false,
}: ExamDeletionImpactDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // 獲取刪除影響分析
  const { data: impacts, isLoading } = isBatch
    ? trpc.exams.getBatchDeletionImpact.useQuery(examIds, { enabled: open && examIds.length > 0 })
    : trpc.exams.getDeletionImpact.useQuery(examIds[0], { enabled: open && examIds.length > 0 });

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // 將單個影響分析轉換為陣列格式
  const impactList = isBatch ? impacts : impacts ? [impacts] : [];

  // 計算總計
  const totalAssigned = impactList?.reduce((sum, impact) => sum + impact.assignedCount, 0) || 0;
  const totalSubmitted = impactList?.reduce((sum, impact) => sum + impact.submittedCount, 0) || 0;
  const totalMakeup = impactList?.reduce((sum, impact) => sum + impact.makeupCount, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            刪除影響分析
          </DialogTitle>
          <DialogDescription>
            {isBatch
              ? `您即將刪除 ${examIds.length} 個考試，請確認以下影響資訊`
              : "請確認以下刪除影響資訊"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 總計卡片 */}
            {isBatch && impactList && impactList.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">
                  影響統計總計
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">已指派考生</p>
                      <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {totalAssigned}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">已提交考試</p>
                      <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {totalSubmitted}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">相關補考</p>
                      <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {totalMakeup}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 詳細影響列表 */}
            <div className="space-y-3">
              {impactList?.map((impact) => (
                <div
                  key={impact.examId}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{impact.examTitle}</h4>
                      <p className="text-sm text-muted-foreground">考試 ID: {impact.examId}</p>
                    </div>
                    {impact.canDelete ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        可安全刪除
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        有相關資料
                      </Badge>
                    )}
                  </div>

                  {/* 影響資訊 */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">已指派考生</p>
                        <p className="font-semibold">{impact.assignedCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">已提交考試</p>
                        <p className="font-semibold">{impact.submittedCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">相關補考</p>
                        <p className="font-semibold">{impact.makeupCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* 警告訊息 */}
                  {impact.warnings.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded p-3">
                      <p className="text-xs font-semibold text-orange-900 dark:text-orange-100 mb-2">
                        ⚠️ 注意事項
                      </p>
                      <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
                        {impact.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 刪除說明 */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 提示：</strong>刪除後的考試將移至回收站，您可以在 30 天內恢復。
                相關的考生指派、提交記錄和補考資料將被保留。
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting || isLoading}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                刪除中...
              </>
            ) : (
              <>確認刪除</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

