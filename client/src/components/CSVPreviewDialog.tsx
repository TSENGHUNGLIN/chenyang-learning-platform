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
import { Loader2, Download, ChevronLeft, ChevronRight } from "lucide-react";
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
              <span>
                共 {previewData.totalRows} 行資料，{previewData.totalColumns} 個欄位
                {previewData.hasMore && " （僅顯示前 100 行）"}
              </span>
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
                          {header || `欄位 ${index + 1}`}
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
                          <TableCell key={cellIndex} className="max-w-xs truncate">
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

