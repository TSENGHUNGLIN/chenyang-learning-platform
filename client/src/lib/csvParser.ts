/**
 * 前端 CSV 解析工具
 * 不依賴任何後端套件，純前端實作
 */

export interface CSVData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

/**
 * 解析 CSV 文字內容
 * @param csvText CSV 文字內容
 * @returns 解析後的資料
 */
export function parseCSV(csvText: string): CSVData {
  if (!csvText || csvText.trim() === "") {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // 移除 BOM 標記
  const cleanText = csvText.replace(/^\uFEFF/, "");

  // 分割成行
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // 解析 CSV 行（處理引號和逗號）
  const parseLine = (line: string): string[] => {
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
        // 欄位分隔符（不在引號內）
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

  // 解析標題行
  const headers = parseLine(lines[0]);

  // 解析資料行
  const rows = lines.slice(1).map(line => parseLine(line));

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * 從 URL 載入 CSV 檔案
 * @param url CSV 檔案 URL
 * @returns 解析後的資料
 */
export async function loadCSVFromURL(url: string): Promise<CSVData> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error("[CSV Parser] 載入失敗:", error);
    throw new Error("無法載入 CSV 檔案：" + (error instanceof Error ? error.message : '未知錯誤'));
  }
}

/**
 * 從 File 物件載入 CSV 檔案
 * @param file File 物件
 * @returns 解析後的資料
 */
export async function loadCSVFromFile(file: File): Promise<CSVData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("無法讀取檔案"));
    };
    
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * 搜尋 CSV 資料
 * @param data CSV 資料
 * @param searchTerm 搜尋關鍵字
 * @returns 篩選後的資料
 */
export function searchCSV(data: CSVData, searchTerm: string): CSVData {
  if (!searchTerm || searchTerm.trim() === "") {
    return data;
  }

  const term = searchTerm.toLowerCase();
  const filteredRows = data.rows.filter(row =>
    row.some(cell => cell.toLowerCase().includes(term))
  );

  return {
    headers: data.headers,
    rows: filteredRows,
    totalRows: filteredRows.length,
  };
}

/**
 * 排序 CSV 資料
 * @param data CSV 資料
 * @param columnIndex 欄位索引
 * @param direction 排序方向（asc/desc）
 * @returns 排序後的資料
 */
export function sortCSV(
  data: CSVData,
  columnIndex: number,
  direction: "asc" | "desc"
): CSVData {
  if (columnIndex < 0 || columnIndex >= data.headers.length) {
    return data;
  }

  const sortedRows = [...data.rows].sort((a, b) => {
    const aValue = a[columnIndex] || "";
    const bValue = b[columnIndex] || "";

    // 嘗試數字比較
    const aNum = parseFloat(aValue);
    const bNum = parseFloat(bValue);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // 字串比較
    return direction === "asc"
      ? aValue.localeCompare(bValue, "zh-TW")
      : bValue.localeCompare(aValue, "zh-TW");
  });

  return {
    headers: data.headers,
    rows: sortedRows,
    totalRows: sortedRows.length,
  };
}

/**
 * 分頁 CSV 資料
 * @param data CSV 資料
 * @param page 頁碼（從 1 開始）
 * @param pageSize 每頁行數
 * @returns 分頁後的資料
 */
export function paginateCSV(
  data: CSVData,
  page: number,
  pageSize: number
): CSVData {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = data.rows.slice(startIndex, endIndex);

  return {
    headers: data.headers,
    rows: paginatedRows,
    totalRows: data.totalRows, // 保留原始總行數
  };
}

/**
 * 計算總頁數
 * @param totalRows 總行數
 * @param pageSize 每頁行數
 * @returns 總頁數
 */
export function getTotalPages(totalRows: number, pageSize: number): number {
  return Math.ceil(totalRows / pageSize);
}

