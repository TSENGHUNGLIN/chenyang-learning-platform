import { useState, useEffect } from "react";
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
import { Loader2, Download, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

interface LocalCSVPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

export default function LocalCSVPreviewDialog({
  open,
  onOpenChange,
  file,
}: LocalCSVPreviewDialogProps) {
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());
  const rowsPerPage = 20;

  // 解析 CSV 檔案
  useEffect(() => {
    if (!file || !open) return;

    const parseCSV = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const text = await file.text();
        
        // 移除 BOM
        let content = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
        
        // 分割成行
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
          throw new Error("CSV 檔案為空");
        }

        // 解析標題行
        const headers = parseCSVLine(lines[0]);
        
        // 解析資料行
        const rows: string[][] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = parseCSVLine(lines[i]);
          // 確保每行的欄位數量與標題一致
          while (row.length < headers.length) {
            row.push("");
          }
          rows.push(row.slice(0, headers.length));
        }

        setCSVData({ headers, rows });
      } catch (err) {
        console.error("CSV 解析錯誤:", err);
        setError(err instanceof Error ? err.message : "解析失敗");
        toast.error("CSV 解析失敗");
      } finally {
        setIsLoading(false);
      }
    };

    parseCSV();
  }, [file, open]);

  // 解析單行 CSV（處理引號和逗號）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 雙引號轉義
          current += '"';
          i++; // 跳過下一個引號
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // 欄位分隔符號
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // 加入最後一個欄位
    result.push(current.trim());

    return result;
  };

  // 計算分頁
  const totalPages = csvData ? Math.ceil(csvData.rows.length / rowsPerPage) : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = csvData?.rows.slice(startIndex, endIndex) || [];

  // 下載檔案
  const handleDownload = () => {
    if (!file) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
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
            <span>CSV 檔案預覽：{file?.name}</span>
            <Button onClick={handleDownload} size="sm" variant="outline" disabled={!file}>
              <Download className="w-4 h-4 mr-2" />
              下載檔案
            </Button>
          </DialogTitle>
          <DialogDescription>
            {csvData && (
              <span>
                共 {csvData.rows.length} 行資料，{csvData.headers.length} 個欄位
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
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {csvData && !isLoading && !error && (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 bg-muted">#</TableHead>
                      {csvData.headers.map((header, index) => (
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
                    顯示第 {startIndex + 1} - {Math.min(endIndex, csvData.rows.length)} 行
                    （共 {csvData.rows.length} 行）
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

