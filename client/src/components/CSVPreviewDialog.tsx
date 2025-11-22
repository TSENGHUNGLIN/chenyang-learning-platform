import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, ChevronLeft, ChevronRight, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

interface CSVPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
}

export default function CSVPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
}: CSVPreviewDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());
  const rowsPerPage = 20;

  // 查詢 CSV 預覽資料
  const { data: previewData, isLoading, error } = trpc.files.previewCSV.useQuery(
    { fileUrl, maxRows: 100 },
    { enabled: open }
  );

  // 計算分頁
  const totalPages = previewData
    ? Math.ceil(previewData.rows.length / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = previewData?.rows.slice(startIndex, endIndex) || [];

  // 下載檔案
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("開始下載檔案");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>CSV 檔案預覽：{fileName}</span>
            <Button onClick={handleDownload} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              下載檔案
            </Button>
          </DialogTitle>
          <DialogDescription>
            {previewData && (
              <div className="space-y-2">
                <span>
                  共 {previewData.totalRows} 行資料，{previewData.totalColumns} 個欄位
                  {previewData.hasMore && " （僅顯示前 100 行）"}
                </span>
                {previewData.hasMore && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold">資料量較大</p>
                      <p className="mt-1">
                        此 CSV 檔案包含超過 100 行資料，為了提升載入速度，目前僅顯示前 100 行。
                        如需查看完整資料，請下載檔案後使用 Excel 或其他工具開啟。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">載入中...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <p className="font-semibold">載入失敗</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {previewData && !isLoading && !error && (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 bg-muted">#</TableHead>
                      {previewData.headers.map((header, index) => (
                        <TableHead key={index} className="bg-muted font-semibold">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{header || `欄位 ${index + 1}`}</span>
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedColumns);
                                if (newExpanded.has(index)) {
                                  newExpanded.delete(index);
                                } else {
                                  newExpanded.add(index);
                                }
                                setExpandedColumns(newExpanded);
                              }}
                              className="p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                              title={expandedColumns.has(index) ? "縮小欄位" : "展開欄位"}
                            >
                              {expandedColumns.has(index) ? (
                                <Minimize2 className="w-3 h-3" />
                              ) : (
                                <Maximize2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.map((row, rowIndex) => (
                      <TableRow key={startIndex + rowIndex}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {startIndex + rowIndex + 1}
                        </TableCell>
                        {row.map((cell, cellIndex) => (
                          <TableCell 
                            key={cellIndex} 
                            className={expandedColumns.has(cellIndex) ? "max-w-2xl" : "max-w-xs truncate"}
                            title={cell}
                          >
                            {cell || <span className="text-muted-foreground italic">空白</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    顯示第 {startIndex + 1} - {Math.min(endIndex, previewData.rows.length)} 行
                    （共 {previewData.rows.length} 行）
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一頁
                    </Button>
                    <span className="text-sm">
                      第 {currentPage} / {totalPages} 頁
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一頁
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

