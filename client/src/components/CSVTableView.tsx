import { useState, useEffect } from "react";
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
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  type CSVData,
  searchCSV,
  sortCSV,
  paginateCSV,
  getTotalPages,
} from "@/lib/csvParser";

interface CSVTableViewProps {
  data: CSVData;
  pageSize?: number;
}

export default function CSVTableView({ data, pageSize = 20 }: CSVTableViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [processedData, setProcessedData] = useState<CSVData>(data);

  // 處理資料（搜尋 → 排序 → 分頁）
  useEffect(() => {
    let result = data;

    // 1. 搜尋
    if (searchTerm) {
      result = searchCSV(result, searchTerm);
    }

    // 2. 排序
    if (sortColumn !== null) {
      result = sortCSV(result, sortColumn, sortDirection);
    }

    // 3. 分頁
    const paginatedResult = paginateCSV(result, currentPage, pageSize);

    setProcessedData({ ...paginatedResult, totalRows: result.totalRows });
  }, [data, searchTerm, sortColumn, sortDirection, currentPage, pageSize]);

  // 處理排序
  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // 切換排序方向
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      // 新欄位，預設升序
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
    setCurrentPage(1); // 重置到第一頁
  };

  // 處理搜尋
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 重置到第一頁
  };

  // 計算總頁數
  const totalPages = getTotalPages(processedData.totalRows, pageSize);

  // 高亮搜尋關鍵字
  const highlightText = (text: string) => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // 渲染排序圖示
  const renderSortIcon = (columnIndex: number) => {
    if (sortColumn !== columnIndex) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* 搜尋欄位 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜尋..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          共 {processedData.totalRows} 行
        </div>
      </div>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {processedData.headers.map((header, index) => (
                  <TableHead key={index} className="min-w-[150px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(index)}
                      className="h-8 px-2 font-semibold hover:bg-accent"
                    >
                      {header}
                      {renderSortIcon(index)}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={processedData.headers.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchTerm ? "找不到符合的資料" : "沒有資料"}
                  </TableCell>
                </TableRow>
              ) : (
                processedData.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex} className="min-w-[150px]">
                        {highlightText(cell)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            第 {currentPage} 頁，共 {totalPages} 頁
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              下一頁
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

