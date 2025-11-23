/**
 * CSV 格式驗證模組
 * 提供必要欄位檢測、資料類型驗證和詳細錯誤訊息
 */

/**
 * 欄位驗證規則
 */
export interface FieldValidationRule {
  name: string; // 欄位名稱
  required: boolean; // 是否必填
  type?: "string" | "number" | "email" | "date" | "boolean"; // 資料類型
  pattern?: RegExp; // 正則表達式驗證
  min?: number; // 最小值（數字）或最小長度（字串）
  max?: number; // 最大值（數字）或最大長度（字串）
  enum?: string[]; // 允許的值列表
}

/**
 * 驗證錯誤
 */
export interface ValidationError {
  row: number; // 錯誤所在行號（從 1 開始）
  column: string; // 錯誤所在欄位名稱
  value: string; // 錯誤的值
  message: string; // 錯誤訊息
  type: "missing" | "type" | "format" | "range" | "enum"; // 錯誤類型
}

/**
 * 驗證結果
 */
export interface ValidationResult {
  valid: boolean; // 是否通過驗證
  errors: ValidationError[]; // 錯誤列表
  warnings: ValidationError[]; // 警告列表（非致命錯誤）
  summary: {
    totalRows: number; // 總行數
    validRows: number; // 有效行數
    errorRows: number; // 錯誤行數
    warningRows: number; // 警告行數
  };
}

/**
 * 驗證電子郵件格式
 */
function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * 驗證日期格式
 */
function isValidDate(dateStr: string): boolean {
  // 支援多種日期格式
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
  ];

  if (!patterns.some((p) => p.test(dateStr))) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 驗證數字格式
 */
function isValidNumber(numStr: string): boolean {
  const num = Number(numStr);
  return !isNaN(num) && isFinite(num);
}

/**
 * 驗證單一欄位值
 */
function validateFieldValue(
  value: string,
  rule: FieldValidationRule,
  rowIndex: number
): ValidationError | null {
  const trimmedValue = value.trim();

  // 檢查必填欄位
  if (rule.required && !trimmedValue) {
    return {
      row: rowIndex + 1,
      column: rule.name,
      value,
      message: `欄位「${rule.name}」為必填，不能為空`,
      type: "missing",
    };
  }

  // 如果欄位為空且非必填，跳過其他驗證
  if (!trimmedValue) {
    return null;
  }

  // 檢查資料類型
  if (rule.type) {
    switch (rule.type) {
      case "number":
        if (!isValidNumber(trimmedValue)) {
          return {
            row: rowIndex + 1,
            column: rule.name,
            value,
            message: `欄位「${rule.name}」必須是數字，但收到「${trimmedValue}」`,
            type: "type",
          };
        }
        break;

      case "email":
        if (!isValidEmail(trimmedValue)) {
          return {
            row: rowIndex + 1,
            column: rule.name,
            value,
            message: `欄位「${rule.name}」必須是有效的電子郵件格式`,
            type: "format",
          };
        }
        break;

      case "date":
        if (!isValidDate(trimmedValue)) {
          return {
            row: rowIndex + 1,
            column: rule.name,
            value,
            message: `欄位「${rule.name}」必須是有效的日期格式（例如：YYYY-MM-DD）`,
            type: "format",
          };
        }
        break;

      case "boolean":
        const lowerValue = trimmedValue.toLowerCase();
        if (!["true", "false", "是", "否", "1", "0", "yes", "no"].includes(lowerValue)) {
          return {
            row: rowIndex + 1,
            column: rule.name,
            value,
            message: `欄位「${rule.name}」必須是布林值（true/false、是/否、1/0）`,
            type: "type",
          };
        }
        break;
    }
  }

  // 檢查正則表達式
  if (rule.pattern && !rule.pattern.test(trimmedValue)) {
    return {
      row: rowIndex + 1,
      column: rule.name,
      value,
      message: `欄位「${rule.name}」格式不符合要求`,
      type: "format",
    };
  }

  // 檢查數字範圍
  if (rule.type === "number" && (rule.min !== undefined || rule.max !== undefined)) {
    const num = Number(trimmedValue);
    if (rule.min !== undefined && num < rule.min) {
      return {
        row: rowIndex + 1,
        column: rule.name,
        value,
        message: `欄位「${rule.name}」的值必須大於或等於 ${rule.min}`,
        type: "range",
      };
    }
    if (rule.max !== undefined && num > rule.max) {
      return {
        row: rowIndex + 1,
        column: rule.name,
        value,
        message: `欄位「${rule.name}」的值必須小於或等於 ${rule.max}`,
        type: "range",
      };
    }
  }

  // 檢查字串長度
  if (rule.type === "string" && (rule.min !== undefined || rule.max !== undefined)) {
    const length = trimmedValue.length;
    if (rule.min !== undefined && length < rule.min) {
      return {
        row: rowIndex + 1,
        column: rule.name,
        value,
        message: `欄位「${rule.name}」的長度必須至少 ${rule.min} 個字元`,
        type: "range",
      };
    }
    if (rule.max !== undefined && length > rule.max) {
      return {
        row: rowIndex + 1,
        column: rule.name,
        value,
        message: `欄位「${rule.name}」的長度不能超過 ${rule.max} 個字元`,
        type: "range",
      };
    }
  }

  // 檢查枚舉值
  if (rule.enum && !rule.enum.includes(trimmedValue)) {
    return {
      row: rowIndex + 1,
      column: rule.name,
      value,
      message: `欄位「${rule.name}」的值必須是以下之一：${rule.enum.join("、")}`,
      type: "enum",
    };
  }

  return null;
}

/**
 * 驗證 CSV 資料
 * @param headers CSV 標題列
 * @param rows CSV 資料列
 * @param rules 驗證規則
 * @returns 驗證結果
 */
export function validateCSV(
  headers: string[],
  rows: string[][],
  rules: FieldValidationRule[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. 檢查必要欄位是否存在
  for (const rule of rules) {
    if (rule.required && !headers.includes(rule.name)) {
      errors.push({
        row: 0,
        column: rule.name,
        value: "",
        message: `缺少必要欄位「${rule.name}」`,
        type: "missing",
      });
    }
  }

  // 如果缺少必要欄位，直接返回錯誤
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      summary: {
        totalRows: rows.length,
        validRows: 0,
        errorRows: rows.length,
        warningRows: 0,
      },
    };
  }

  // 2. 建立欄位索引對照表
  const fieldIndexMap = new Map<string, number>();
  headers.forEach((header, index) => {
    fieldIndexMap.set(header, index);
  });

  // 3. 驗證每一行資料
  let validRows = 0;
  const errorRowSet = new Set<number>();
  const warningRowSet = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let hasError = false;

    for (const rule of rules) {
      const fieldIndex = fieldIndexMap.get(rule.name);
      if (fieldIndex === undefined) continue;

      const value = row[fieldIndex] || "";
      const error = validateFieldValue(value, rule, i);

      if (error) {
        // 所有驗證錯誤都算作錯誤，不分類為警告
        errors.push(error);
        errorRowSet.add(i);
        hasError = true;
      }
    }

    if (!hasError) {
      validRows++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      validRows,
      errorRows: errorRowSet.size,
      warningRows: warningRowSet.size,
    },
  };
}

/**
 * 預設的員工批次匯入驗證規則
 */
export const EMPLOYEE_IMPORT_RULES: FieldValidationRule[] = [
  {
    name: "姓名",
    required: true,
    type: "string",
    min: 2,
    max: 50,
  },
  {
    name: "部門名稱",
    required: true,
    type: "string",
    min: 2,
    max: 50,
  },
  {
    name: "電子郵件",
    required: false,
    type: "email",
  },
];

/**
 * 預設的考試範本匯入驗證規則
 */
export const EXAM_TEMPLATE_IMPORT_RULES: FieldValidationRule[] = [
  {
    name: "題目",
    required: true,
    type: "string",
    min: 5,
  },
  {
    name: "題型",
    required: true,
    type: "string",
    enum: ["是非題", "選擇題", "問答題"],
  },
  {
    name: "難度",
    required: true,
    type: "string",
    enum: ["簡單", "中等", "困難"],
  },
  {
    name: "正確答案",
    required: true,
    type: "string",
  },
  {
    name: "分數",
    required: false,
    type: "number",
    min: 1,
    max: 100,
  },
];

