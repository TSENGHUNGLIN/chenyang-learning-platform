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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Eye, Trash2, FileText, Calendar, User } from "lucide-react";

export default function AnalysisHistory() {
  const [, setLocation] = useLocation();
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 查詢歷史記錄
  const { data: historyRecords, isLoading, refetch } = trpc.analysis.historyList.useQuery();
  
  // 刪除歷史記錄
  const deleteHistoryMutation = trpc.analysis.deleteHistory.useMutation({
    onSuccess: () => {
      toast.success("歷史記錄已刪除");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這筆歷史記錄嗎？")) {
      deleteHistoryMutation.mutate(id);
    }
  };

  const getAnalysisTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      generate_questions: "出考題",
      analyze_questions: "分析考題",
      other: "其他分析",
    };
    return labels[type] || type;
  };

  const getAnalysisModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      file_only: "檔案內資料分析",
      with_context: "結合題庫分析",
    };
    return labels[mode] || mode;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="container max-w-7xl">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首頁
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI 分析歷史記錄</h1>
              <p className="text-muted-foreground mt-1">查看所有AI分析的歷史記錄</p>
            </div>
          </div>
        </div>

        {/* 歷史記錄列表 */}
        {!historyRecords || historyRecords.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">尚無歷史記錄</p>
              <p className="text-sm text-muted-foreground mt-2">執行AI分析後，記錄將顯示在這裡</p>
              <Button
                className="mt-6"
                onClick={() => setLocation("/ai-analysis")}
              >
                前往AI分析
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>歷史記錄列表</CardTitle>
              <CardDescription>共 {historyRecords.length} 筆記錄</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分析時間</TableHead>
                    <TableHead>分析類型</TableHead>
                    <TableHead>分析模式</TableHead>
                    <TableHead>檔案數量</TableHead>
                    <TableHead>使用者</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(record.createdAt).toLocaleString('zh-TW')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getAnalysisTypeLabel(record.analysisType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getAnalysisModeLabel(record.analysisMode)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {record.fileNames ? record.fileNames.split(',').length : 0} 個檔案
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{record.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(record)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            刪除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 詳情對話框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>分析詳情</DialogTitle>
              <DialogDescription>
                分析時間：{selectedRecord && new Date(selectedRecord.createdAt).toLocaleString('zh-TW')}
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-6">
                {/* 基本資訊 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">分析類型</label>
                    <p className="mt-1">{getAnalysisTypeLabel(selectedRecord.analysisType)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">分析模式</label>
                    <p className="mt-1">{getAnalysisModeLabel(selectedRecord.analysisMode)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">分析檔案</label>
                    <p className="mt-1">{selectedRecord.fileNames || "無"}</p>
                  </div>
                  {selectedRecord.prompt && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">使用者提示詞</label>
                      <p className="mt-1 whitespace-pre-wrap">{selectedRecord.prompt}</p>
                    </div>
                  )}
                </div>

                {/* 分析結果 */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">分析結果</label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{selectedRecord.analysisResult}</pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

