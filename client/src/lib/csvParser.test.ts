import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  searchCSV,
  sortCSV,
  paginateCSV,
  getTotalPages,
} from './csvParser';

describe('CSV Parser', () => {
  const sampleCSV = `姓名,年齡,部門
張三,25,業務部
李四,30,技術部
王五,28,行銷部
趙六,35,財務部
錢七,27,人資部`;

  describe('parseCSV', () => {
    it('應該正確解析 CSV 文字', () => {
      const result = parseCSV(sampleCSV);
      
      expect(result.headers).toEqual(['姓名', '年齡', '部門']);
      expect(result.rows).toHaveLength(5);
      expect(result.rows[0]).toEqual(['張三', '25', '業務部']);
      expect(result.totalRows).toBe(5);
    });

    it('應該處理空白 CSV', () => {
      const result = parseCSV('');
      
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it('應該處理包含引號的 CSV', () => {
      const csvWithQuotes = `名稱,描述
產品A,"這是一個""特殊""產品"
產品B,"包含,逗號,的描述"`;
      
      const result = parseCSV(csvWithQuotes);
      
      expect(result.headers).toEqual(['名稱', '描述']);
      expect(result.rows[0][1]).toBe('這是一個"特殊"產品');
      expect(result.rows[1][1]).toBe('包含,逗號,的描述');
    });

    it('應該移除 BOM 標記', () => {
      const csvWithBOM = '\uFEFF姓名,年齡\n張三,25';
      const result = parseCSV(csvWithBOM);
      
      expect(result.headers[0]).toBe('姓名');
    });
  });

  describe('searchCSV', () => {
    it('應該能夠搜尋資料', () => {
      const data = parseCSV(sampleCSV);
      const result = searchCSV(data, '技術');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['李四', '30', '技術部']);
      expect(result.totalRows).toBe(1);
    });

    it('應該不區分大小寫搜尋', () => {
      const data = parseCSV(sampleCSV);
      const result = searchCSV(data, '張');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][0]).toBe('張三');
    });

    it('空白搜尋應該返回所有資料', () => {
      const data = parseCSV(sampleCSV);
      const result = searchCSV(data, '');
      
      expect(result.rows).toHaveLength(5);
      expect(result.totalRows).toBe(5);
    });

    it('找不到結果應該返回空陣列', () => {
      const data = parseCSV(sampleCSV);
      const result = searchCSV(data, '不存在的關鍵字');
      
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });
  });

  describe('sortCSV', () => {
    it('應該能夠升序排序文字欄位', () => {
      const data = parseCSV(sampleCSV);
      const result = sortCSV(data, 0, 'asc'); // 按姓名升序
      
      expect(result.rows[0][0]).toBe('張三');
      expect(result.rows[result.rows.length - 1][0]).toBe('錢七');
    });

    it('應該能夠降序排序文字欄位', () => {
      const data = parseCSV(sampleCSV);
      const result = sortCSV(data, 0, 'desc'); // 按姓名降序
      
      expect(result.rows[0][0]).toBe('錢七');
      expect(result.rows[result.rows.length - 1][0]).toBe('張三');
    });

    it('應該能夠排序數字欄位', () => {
      const data = parseCSV(sampleCSV);
      const result = sortCSV(data, 1, 'asc'); // 按年齡升序
      
      expect(result.rows[0][1]).toBe('25');
      expect(result.rows[result.rows.length - 1][1]).toBe('35');
    });

    it('無效的欄位索引應該返回原始資料', () => {
      const data = parseCSV(sampleCSV);
      const result = sortCSV(data, 999, 'asc');
      
      expect(result.rows).toEqual(data.rows);
    });
  });

  describe('paginateCSV', () => {
    it('應該能夠分頁資料', () => {
      const data = parseCSV(sampleCSV);
      const result = paginateCSV(data, 1, 2); // 第1頁，每頁2行
      
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('張三');
      expect(result.rows[1][0]).toBe('李四');
      expect(result.totalRows).toBe(5); // 保留原始總行數
    });

    it('應該能夠取得第二頁資料', () => {
      const data = parseCSV(sampleCSV);
      const result = paginateCSV(data, 2, 2); // 第2頁，每頁2行
      
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('王五');
      expect(result.rows[1][0]).toBe('趙六');
    });

    it('最後一頁可能少於每頁行數', () => {
      const data = parseCSV(sampleCSV);
      const result = paginateCSV(data, 3, 2); // 第3頁，每頁2行
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][0]).toBe('錢七');
    });
  });

  describe('getTotalPages', () => {
    it('應該正確計算總頁數', () => {
      expect(getTotalPages(10, 3)).toBe(4); // 10行，每頁3行 = 4頁
      expect(getTotalPages(9, 3)).toBe(3);  // 9行，每頁3行 = 3頁
      expect(getTotalPages(0, 3)).toBe(0);  // 0行 = 0頁
    });
  });
});

