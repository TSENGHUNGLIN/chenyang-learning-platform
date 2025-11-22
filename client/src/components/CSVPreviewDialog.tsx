import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, ChevronLeft, ChevronRight, AlertCircle, Maximize2, Minimize2, ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterText, setFilterText] = useState("");
  const rowsPerPage = 20;

  // 查詢 CSV 預覽資料
  const { data: previewData, isLoading, error } = trpc.files.previewCSV.useQuery(
    { fileUrl, maxRows: 100 },
    { enabled: open }
  );

  // 處理排序
  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // 切換排序方向
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 新欄位排序，預設升序
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
    setCurrentPage(1); // 重置到第一頁
  };

  // 排序和篩選後的資料
  const filteredAndSortedRows = useMemo(() => {
    if (!previewData) return [];

    let rows = [...previewData.rows];

    // 1. 篩選
    if (filterText.trim()) {
      const searchText = filterText.toLowerCase();
      rows = rows.filter(row =>
        row.some(cell => cell.toLowerCase().includes(searchText))
      );
    }

    // 2. 排序
    if (sortColumn !== null) {
      rows.sort((a, b) => {
        const aValue = a[sortColumn] || "";
        const bValue = b[sortColumn] || "";

        // 嘗試數字比較
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }

        // 字串比較
        const comparison = aValue.localeCompare(bValue, "zh-TW");
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return rows;
  }, [previewData, sortColumn, sortDirection, filterText]);

  // 計算分頁
  const totalPages = Math.ceil(filteredAndSortedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredAndSortedRows.slice(startIndex, endIndex);

  // 重置篩選
  const handleClearFilter = () => {
    setFilterText("");
    setCurrentPage(1);
  };

  // 重置排序
  const handleClearSort = () => {
    setSortColumn(null);
    setSortDirection("asc");
    setCurrentPage(1);
  };

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
          <DialogDescription className="space-y-2">
            {previewData && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="block">
                    共 {previewData.totalRows} 行資料，{previewData.totalColumns} 個欄位
                    {previewData.hasMore && " （僅顯示前 100 行）"}
                  </span>
                  {previewData.encoding && (
                    <Badge variant="outline" className="text-xs">
                      編碼：{previewData.encoding.toUpperCase()}
                      {previewData.encodingConfidence !== undefined && 
                        ` (${previewData.encodingConfidence}%)`}
                    </Badge>
                  )}
                </div>
                {previewData.hasMore && (
                  <span className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold">資料量較大</p>
                      <p className="mt-1">
                        此 CSV 檔案包含超過 100 行資料，為了提升載入速度，目前僅顯示前 100 行。
                        如需查看完整資料，請下載檔案後使用 Excel 或其他工具開啟。
                      </p>
                    </span>
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* 篩選和排序控制 */}
        {previewData && !isLoading && !error && (
          <div className="flex items-center gap-3 mt-4 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜尋資料..."
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-9"
              />
              {filterText && (
                <button
                  onClick={handleClearFilter}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="清除篩選"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {sortColumn !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSort}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4 mr-1" />
                清除排序
              </Button>
            )}
            {filterText && (
              <div className="text-sm text-muted-foreground flex-shrink-0">
                找到 {filteredAndSortedRows.length} 筆結果
              </div>
            )}
          </div>
        )}

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
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSort(index)}
                                className="p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                                title="排序"
                              >
                                {sortColumn === index ? (
                                  sortDirection === "asc" ? (
                                    <ArrowUp className="w-3 h-3 text-primary" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 text-primary" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3" />
                                )}
                              </button>
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
                        {row.map((cell, cellIndex) => {
                          // 高亮篩選關鍵字
                          const highlightedCell = filterText && cell ? (
                            cell.split(new RegExp(`(${filterText})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === filterText.toLowerCase() ? (
                                <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
                              ) : (
                                part
                              )
                            )
                          ) : cell;

                          return (
                            <TableCell 
                              key={cellIndex} 
                              className={expandedColumns.has(cellIndex) ? "max-w-2xl" : "max-w-xs truncate"}
                              title={cell}
                            >
                              {cell ? highlightedCell : <span className="text-muted-foreground italic">空白</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    顯示第 {startIndex + 1} - {Math.min(endIndex, filteredAndSortedRows.length)} 行
                    （共 {filteredAndSortedRows.length} 行{filterText && ` / 原始 ${previewData.rows.length} 行`}）
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

