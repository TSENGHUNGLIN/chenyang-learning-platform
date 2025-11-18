import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, departments, InsertDepartment, employees, InsertEmployee, files, InsertFile, analysisResults, InsertAnalysisResult, fileReadLogs, InsertFileReadLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    // 查詢使用者是否已存在
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    const userExists = existingUser.length > 0;

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (!userExists) {
      // 僅在新使用者時設定 role
      if (user.openId === ENV.ownerOpenId) {
        // 專案擁有者自動批准為管理員
        values.role = 'admin';
      } else {
        // 新使用者預設為待審核狀態
        values.role = 'pending';
      }
    }
    // 如果使用者已存在且 user.role 未定義，則不更新 role

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Department queries
export async function getAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(departments);
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(departments).values(data);
  return result;
}

export async function updateDepartment(data: { id: number; name: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(departments).set({ name: data.name, description: data.description }).where(eq(departments.id, data.id));
  return { success: true };
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(departments).where(eq(departments.id, id));
  return { success: true };
}

// Employee queries
export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees);
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmployeesByDepartment(departmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees).where(eq(employees.departmentId, departmentId));
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employees).values(data);
  // 查詢新建立的員工資料
  const newEmployee = await db.select().from(employees).where(eq(employees.name, data.name)).orderBy(desc(employees.id)).limit(1);
  if (newEmployee.length === 0) throw new Error("Failed to create employee");
  return newEmployee[0];
}

export async function updateEmployee(data: { id: number; name: string; departmentId: number; email?: string; phone?: string; position?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set({
    name: data.name,
    departmentId: data.departmentId,
    email: data.email,
    phone: data.phone,
    position: data.position
  }).where(eq(employees.id, data.id));
  return { success: true };
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employees).where(eq(employees.id, id));
  return { success: true };
}

// File queries
export async function getAllFiles() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(files);
}

export async function getFilesWithFilters(filters: {
  page?: number;
  pageSize?: number;
  departmentId?: number;
  employeeId?: number;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}) {
  const db = await getDb();
  if (!db) return { files: [], total: 0, page: 1, pageSize: 20 };
  
  const { and, like, gte, lte, inArray } = await import("drizzle-orm");
  
  const conditions = [];
  
  // 篩選部門（透過人員）
  if (filters.departmentId) {
    const employeesInDept = await db.select().from(employees).where(eq(employees.departmentId, filters.departmentId));
    const employeeIds = employeesInDept.map(e => e.id);
    if (employeeIds.length > 0) {
      conditions.push(inArray(files.employeeId, employeeIds));
    } else {
      // 如果部門沒有人員，返回空結果
      return { files: [], total: 0, page: filters.page || 1, pageSize: filters.pageSize || 20 };
    }
  }
  
  // 篩選人員
  if (filters.employeeId) {
    conditions.push(eq(files.employeeId, filters.employeeId));
  }
  
  // 篩選日期範圍
  if (filters.startDate) {
    conditions.push(gte(files.uploadDate, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(files.uploadDate, new Date(filters.endDate)));
  }
  
  // 關鍵字搜尋（檔案內容、人員姓名、部門名稱）
  if (filters.keyword) {
    const { or } = await import("drizzle-orm");
    
    // 搜尋人員姓名
    const matchingEmployees = await db.select().from(employees).where(like(employees.name, `%${filters.keyword}%`));
    const employeeIdsByName = matchingEmployees.map(e => e.id);
    
    // 搜尋部門名稱
    const matchingDepartments = await db.select().from(departments).where(like(departments.name, `%${filters.keyword}%`));
    const departmentIds = matchingDepartments.map(d => d.id);
    const employeesInMatchingDepts = departmentIds.length > 0 
      ? await db.select().from(employees).where(inArray(employees.departmentId, departmentIds))
      : [];
    const employeeIdsByDept = employeesInMatchingDepts.map(e => e.id);
    
    // 組合所有符合條件的人員ID
    const allMatchingEmployeeIds = Array.from(new Set([...employeeIdsByName, ...employeeIdsByDept]));
    
    // 建立搜尋條件：檔案內容 OR 人員姓名 OR 部門名稱
    const searchConditions = [
      like(files.extractedText, `%${filters.keyword}%`),
    ];
    
    if (allMatchingEmployeeIds.length > 0) {
      searchConditions.push(inArray(files.employeeId, allMatchingEmployeeIds));
    }
    
    conditions.push(or(...searchConditions));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // 查詢總數
  const totalResult = whereClause 
    ? await db.select().from(files).where(whereClause)
    : await db.select().from(files);
  const total = totalResult.length;
  
  // 分頁查詢
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  const result = whereClause
    ? await db.select().from(files).where(whereClause).limit(pageSize).offset(offset)
    : await db.select().from(files).limit(pageSize).offset(offset);
  
  return {
    files: result,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getFileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFilesByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(files).where(eq(files.employeeId, employeeId));
}

export async function createFile(data: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(files).values(data);
  return result;
}

export async function searchFiles(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  const { like } = await import("drizzle-orm");
  return await db.select().from(files).where(like(files.extractedText, `%${keyword}%`));
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(files).where(eq(files.id, id));
  return { success: true };
}

// Analysis queries
export async function getAnalysisByFileId(fileId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(analysisResults).where(eq(analysisResults.fileId, fileId));
}

export async function createAnalysis(data: InsertAnalysisResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(analysisResults).values(data);
  return result;
}

// User management queries
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function updateUserRole(openId: string, role: "admin" | "editor" | "viewer" | "pending") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.openId, openId));
}

export async function deleteUser(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.openId, openId));
}


// File read log queries
export async function logFileRead(fileId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fileReadLogs).values({ fileId, userId });
}

export async function getLastReadTime(fileId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const logs = await db.select().from(fileReadLogs)
    .where(eq(fileReadLogs.fileId, fileId))
    .orderBy(fileReadLogs.readAt);
  return logs.length > 0 ? logs[logs.length - 1].readAt : null;
}

export async function getFileWithReadInfo(fileId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const file = await getFileById(fileId);
  if (!file) return null;
  
  const lastRead = await getLastReadTime(fileId, userId);
  
  return {
    ...file,
    lastReadAt: lastRead,
  };
}


// Question bank queries
export async function getAllQuestions() {
  const db = await getDb();
  if (!db) return [];
  const { questions } = await import("../drizzle/schema");
  return await db.select().from(questions).orderBy(questions.createdAt);
}

export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { questions } = await import("../drizzle/schema");
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getQuestionsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  const { questions } = await import("../drizzle/schema");
  return await db.select().from(questions).where(eq(questions.categoryId, categoryId));
}

export async function getQuestionsByDifficulty(difficulty: "easy" | "medium" | "hard") {
  const db = await getDb();
  if (!db) return [];
  const { questions } = await import("../drizzle/schema");
  return await db.select().from(questions).where(eq(questions.difficulty, difficulty));
}

export async function createQuestion(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  const result = await db.insert(questions).values(data);
  return result;
}

export async function updateQuestion(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  await db.update(questions).set(data).where(eq(questions.id, id));
  return { success: true };
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  await db.delete(questions).where(eq(questions.id, id));
  return { success: true };
}

// Question category queries
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  const { questionCategories } = await import("../drizzle/schema");
  return await db.select().from(questionCategories).orderBy(questionCategories.name);
}

export async function createCategory(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questionCategories } = await import("../drizzle/schema");
  const result = await db.insert(questionCategories).values(data);
  return result;
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questionCategories } = await import("../drizzle/schema");
  await db.delete(questionCategories).where(eq(questionCategories.id, id));
  return { success: true };
}



// Category management with hierarchy support
export async function getCategoryTree() {
  const db = await getDb();
  if (!db) return [];
  const { questionCategories } = await import("../drizzle/schema");
  const categories = await db.select().from(questionCategories).orderBy(questionCategories.name);
  
  // Build tree structure
  const buildTree = (parentId: number | null): any[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        ...cat,
        children: buildTree(cat.id),
      }));
  };
  
  return buildTree(null);
}

export async function updateCategory(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questionCategories } = await import("../drizzle/schema");
  await db.update(questionCategories).set(data).where(eq(questionCategories.id, id));
  return { success: true };
}

// Tag management
export async function getAllTags() {
  const db = await getDb();
  if (!db) return [];
  const { tags } = await import("../drizzle/schema");
  return await db.select().from(tags).orderBy(tags.name);
}

export async function createTag(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { tags } = await import("../drizzle/schema");
  const result = await db.insert(tags).values(data);
  return result;
}

export async function updateTag(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { tags } = await import("../drizzle/schema");
  await db.update(tags).set(data).where(eq(tags.id, id));
  return { success: true };
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { tags, questionTags } = await import("../drizzle/schema");
  
  // Delete all question-tag associations first
  await db.delete(questionTags).where(eq(questionTags.tagId, id));
  
  // Then delete the tag
  await db.delete(tags).where(eq(tags.id, id));
  return { success: true };
}

// Question-Tag association management
export async function getQuestionTags(questionId: number) {
  const db = await getDb();
  if (!db) return [];
  const { questionTags, tags } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(questionTags)
    .innerJoin(tags, eq(questionTags.tagId, tags.id))
    .where(eq(questionTags.questionId, questionId));
  
  return result;
}

export async function addQuestionTag(questionId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questionTags } = await import("../drizzle/schema");
  await db.insert(questionTags).values({ questionId, tagId });
  return { success: true };
}

export async function removeQuestionTag(questionId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questionTags } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.delete(questionTags)
    .where(
      and(
        eq(questionTags.questionId, questionId),
        eq(questionTags.tagId, tagId)
      )
    );
  return { success: true };
}

export async function setQuestionTags(questionId: number, tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questionTags } = await import("../drizzle/schema");
  
  // Delete all existing tags for this question
  await db.delete(questionTags).where(eq(questionTags.questionId, questionId));
  
  // Add new tags
  if (tagIds.length > 0) {
    await db.insert(questionTags).values(
      tagIds.map(tagId => ({ questionId, tagId }))
    );
  }
  
  return { success: true };
}



// ==================== 考核記錄相關函數 ====================

export async function createAssessmentRecord(data: {
  employeeId: number;
  analysisType: string;
  score?: number;
  result: string;
  fileIds?: number[];
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { assessmentRecords } = await import("../drizzle/schema");
  
  const [record] = await db.insert(assessmentRecords).values({
    employeeId: data.employeeId,
    analysisType: data.analysisType,
    score: data.score,
    result: data.result,
    fileIds: data.fileIds ? JSON.stringify(data.fileIds) : null,
    createdBy: data.createdBy,
  });
  
  return record;
}

export async function getAssessmentRecordsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  const { assessmentRecords } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  const records = await db
    .select()
    .from(assessmentRecords)
    .where(eq(assessmentRecords.employeeId, employeeId))
    .orderBy(desc(assessmentRecords.createdAt));
  
  return records;
}

export async function getEmployeeIdByFileId(fileId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const { files } = await import("../drizzle/schema");
  
  const result = await db
    .select({ employeeId: files.employeeId })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  
  return result[0]?.employeeId ?? null;
}


