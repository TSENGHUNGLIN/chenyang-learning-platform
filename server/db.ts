import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, departments, InsertDepartment, employees, InsertEmployee, files, InsertFile, analysisResults, InsertAnalysisResult, fileReadLogs, InsertFileReadLog, analysisHistory, InsertAnalysisHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// Optimized for high concurrency (100+ simultaneous users)
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const mysql = await import('mysql2/promise');
      
      // Create connection pool with optimized settings for 100+ concurrent users
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 150,        // Max connections (increased for 100+ users)
        queueLimit: 50,              // Max queued connection requests
        waitForConnections: true,    // Wait when no connections available
        enableKeepAlive: true,       // Keep connections alive
        keepAliveInitialDelay: 0,    // Send keep-alive immediately
        maxIdle: 50,                 // Max idle connections
        idleTimeout: 60000,          // Close idle connections after 60s
        connectTimeout: 10000,       // Connection timeout: 10s
      });
      
      _db = drizzle(pool);
      console.log('[Database] Connection pool initialized with 150 max connections');
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
        values.role = 'examinee';
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

export async function batchUpdateFileEmployee(fileIds: number[], employeeId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { inArray } = await import("drizzle-orm");
  
  await db.update(files)
    .set({ employeeId, updatedAt: new Date() })
    .where(inArray(files.id, fileIds));
  
  return { success: true, updatedCount: fileIds.length };
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

export async function updateUserRole(openId: string, role: "admin" | "editor" | "viewer" | "examinee") {
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


// Dashboard statistics and recent activities
export async function getDashboardStats(role: string, userId: number) {
  const db = await getDb();
  if (!db) return { totalQuestions: 0, totalExams: 0, averageScore: 0, totalExaminees: 0 };
  
  const { questions, exams, examSubmissions, users } = await import("../drizzle/schema");
  const { sql, isNull, eq } = await import("drizzle-orm");
  
  // 總題數（未刪除）
  const totalQuestionsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(questions)
    .where(isNull(questions.deletedAt));
  const totalQuestions = totalQuestionsResult[0]?.count || 0;
  
  // 總考試數
  const totalExamsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exams);
  const totalExams = totalExamsResult[0]?.count || 0;
  
  // 平均分數（已評分的考試）
  const avgScoreResult = await db
    .select({ avg: sql<number>`AVG(${examSubmissions.score})` })
    .from(examSubmissions)
    .where(sql`${examSubmissions.score} IS NOT NULL`);
  const averageScore = Math.round(avgScoreResult[0]?.avg || 0);
  
  // 總考生數（role = examinee）
  const totalExamineesResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(eq(users.role, 'examinee'));
  const totalExaminees = totalExamineesResult[0]?.count || 0;
  
  return {
    totalQuestions,
    totalExams,
    averageScore,
    totalExaminees,
  };
}

export async function getRecentActivities(role: string, userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { files, exams, examSubmissions, examAssignments, users } = await import("../drizzle/schema");
  const { sql, desc } = await import("drizzle-orm");
  
  const activities: Array<{
    type: 'file_upload' | 'exam_created' | 'exam_submitted';
    title: string;
    description: string;
    timestamp: Date;
  }> = [];
  
  // 最近上傳檔案（取3筆）
  const recentFiles = await db
    .select({
      filename: files.filename,
      uploaderName: users.name,
      createdAt: files.createdAt,
    })
    .from(files)
    .leftJoin(users, eq(files.uploadedBy, users.id))
    .orderBy(desc(files.createdAt))
    .limit(3);
  
  recentFiles.forEach((file) => {
    activities.push({
      type: 'file_upload',
      title: '檔案上傳',
      description: `${file.uploaderName || '未知使用者'} 上傳了「${file.filename}」`,
      timestamp: file.createdAt,
    });
  });
  
  // 最近建立考試（取3筆）
  const recentExams = await db
    .select({
      title: exams.title,
      creatorName: users.name,
      createdAt: exams.createdAt,
    })
    .from(exams)
    .leftJoin(users, eq(exams.createdBy, users.id))
    .orderBy(desc(exams.createdAt))
    .limit(3);
  
  recentExams.forEach((exam) => {
    activities.push({
      type: 'exam_created',
      title: '考試建立',
      description: `${exam.creatorName || '未知使用者'} 建立了考試「${exam.title}」`,
      timestamp: exam.createdAt,
    });
  });
  
  // 最近提交考試（取3筆）
  // examSubmissions -> examAssignments -> exams, users
  const recentSubmissions = await db
    .select({
      examTitle: exams.title,
      examineeName: users.name,
      submittedAt: examSubmissions.submittedAt,
    })
    .from(examSubmissions)
    .leftJoin(examAssignments, eq(examSubmissions.assignmentId, examAssignments.id))
    .leftJoin(exams, eq(examAssignments.examId, exams.id))
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .where(sql`${examSubmissions.submittedAt} IS NOT NULL`)
    .orderBy(desc(examSubmissions.submittedAt))
    .limit(3);
  
  recentSubmissions.forEach((submission) => {
    activities.push({
      type: 'exam_submitted',
      title: '考試提交',
      description: `${submission.examineeName || '未知考生'} 提交了「${submission.examTitle}」`,
      timestamp: submission.submittedAt!,
    });
  });
  
  // 按時間排序，取10筆
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return activities.slice(0, 10);
}

// Question bank queries
export async function getAllQuestions() {
  const db = await getDb();
  if (!db) return [];
  const { questions, users } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  
  const { isNull } = await import("drizzle-orm");
  
  const result = await db
    .select({
      id: questions.id,
      categoryId: questions.categoryId,
      type: questions.type,
      difficulty: questions.difficulty,
      question: questions.question,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      createdBy: questions.createdBy,
      createdAt: questions.createdAt,
      updatedAt: questions.updatedAt,
      creatorName: users.name,
      source: questions.source,
      isAiGenerated: questions.isAiGenerated,
      suggestedCategoryId: questions.suggestedCategoryId,
      suggestedTagIds: questions.suggestedTagIds,
    })
    .from(questions)
    .leftJoin(users, eq(questions.createdBy, users.id))
    .where(isNull(questions.deletedAt)) // 過濾已刪除的題目
    .orderBy(questions.createdAt);
  
  return result;
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

// 軟刪除題目
export async function softDeleteQuestion(id: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  await db.update(questions)
    .set({ 
      deletedAt: new Date(),
      deletedBy: deletedBy 
    })
    .where(eq(questions.id, id));
  return { success: true };
}

// 查詢已刪除的題目（回收站）
export async function getDeletedQuestions() {
  const db = await getDb();
  if (!db) return [];
  const { questions, users } = await import("../drizzle/schema");
  const { isNotNull, sql } = await import("drizzle-orm");
  
  const result = await db
    .select({
      id: questions.id,
      categoryId: questions.categoryId,
      type: questions.type,
      difficulty: questions.difficulty,
      question: questions.question,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      source: questions.source,
      createdBy: questions.createdBy,
      createdAt: questions.createdAt,
      updatedAt: questions.updatedAt,
      deletedAt: questions.deletedAt,
      deletedBy: questions.deletedBy,
      creatorName: users.name,
      deleterName: sql<string>`(SELECT name FROM users WHERE id = ${questions.deletedBy})`.as('deleterName'),
    })
    .from(questions)
    .leftJoin(users, eq(questions.createdBy, users.id))
    .where(isNotNull(questions.deletedAt))
    .orderBy(questions.deletedAt);
  
  return result;
}

// 還原題目
export async function restoreQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  await db.update(questions)
    .set({ 
      deletedAt: null,
      deletedBy: null 
    })
    .where(eq(questions.id, id));
  return { success: true };
}

// 永久刪除題目（真正從資料庫移除）
export async function permanentDeleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  await db.delete(questions).where(eq(questions.id, id));
  return { success: true };
}

// 清理30天前刪除的題目
export async function cleanupOldDeletedQuestions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { questions } = await import("../drizzle/schema");
  const { isNotNull, lt } = await import("drizzle-orm");
  const { sql } = await import("drizzle-orm");
  
  // 計算30天前的時間
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // 查詢符合條件的題目數量
  const toDelete = await db
    .select({ id: questions.id })
    .from(questions)
    .where(sql`${questions.deletedAt} IS NOT NULL AND ${questions.deletedAt} < ${thirtyDaysAgo}`);
  
  // 刪除這些題目
  if (toDelete.length > 0) {
    await db.delete(questions)
      .where(sql`${questions.deletedAt} IS NOT NULL AND ${questions.deletedAt} < ${thirtyDaysAgo}`);
  }
  
  return toDelete.length;
}

// 保留舊的 deleteQuestion 函數以便相容性（但建議使用 softDeleteQuestion）
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




/**
 * 儲存AI分析歷史記錄
 */
export async function createAnalysisHistory(data: {
  analysisType: string;
  analysisMode: string;
  prompt?: string;
  fileIds: number[];
  fileNames: string[];
  result: string;
  resultHash?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [record] = await db.insert(analysisHistory).values({
    analysisType: data.analysisType,
    analysisMode: data.analysisMode,
    prompt: data.prompt || null,
    resultHash: data.resultHash || null,
    fileIds: JSON.stringify(data.fileIds),
    fileNames: JSON.stringify(data.fileNames),
    result: data.result,
    createdBy: data.createdBy,
  });
  
  return record;
}

/**
 * 查詢所有AI分析歷史記錄（依建立時間倒序）
 */
export async function getAllAnalysisHistory() {
  const db = await getDb();
  if (!db) return [];
  
  const records = await db
    .select()
    .from(analysisHistory)
    .orderBy(desc(analysisHistory.createdAt));
  
  return records;
}

/**
 * 根據ID查詢單一AI分析歷史記錄
 */
export async function getAnalysisHistoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(analysisHistory)
    .where(eq(analysisHistory.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 根擜hash查詢AI分析歷史記錄（用於快取）
 */
export async function getAnalysisHistoryByHash(hash: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(analysisHistory)
    .where(eq(analysisHistory.resultHash, hash))
    .orderBy(desc(analysisHistory.createdAt))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 根據使用者ID查詢AI分析歷史記錄
 */
export async function getAnalysisHistoryByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const records = await db
    .select()
    .from(analysisHistory)
    .where(eq(analysisHistory.createdBy, userId))
    .orderBy(desc(analysisHistory.createdAt));
  
  return records;
}

/**
 * 刪除AI分析歷史記錄
 */
export async function deleteAnalysisHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(analysisHistory).where(eq(analysisHistory.id, id));
}

/**
 * 更新AI分析的品質評分
 */
export async function updateAnalysisQuality(id: number, qualityScore: number, userFeedback?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(analysisHistory)
    .set({
      qualityScore,
      userFeedback: userFeedback || null,
    })
    .where(eq(analysisHistory.id, id));
}



/**
 * 建立考試
 */
export async function createExam(data: {
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore: number;
  totalScore: number;
  gradingMethod: 'auto' | 'manual' | 'mixed';
  status: 'draft' | 'published' | 'archived';
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { exams } = await import("../drizzle/schema");
  
  const [result] = await db.insert(exams).values({
    title: data.title,
    description: data.description || null,
    timeLimit: data.timeLimit || null,
    passingScore: data.passingScore,
    totalScore: data.totalScore,
    gradingMethod: data.gradingMethod,
    status: data.status,
    createdBy: data.createdBy,
  });
  
  // 查詢並回傳新建立的考試記錄
  const insertId = result.insertId;
  const [newExam] = await db.select().from(exams).where(eq(exams.id, insertId)).limit(1);
  
  return newExam;
}

/**
 * 查詢所有考試（包含題目數量）
 */
export async function getAllExams() {
  const db = await getDb();
  if (!db) return [];
  const { exams, examQuestions } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  
  // 使用左連接查詢考試和題目數量（過濾已刪除的考試）
  const { isNull } = await import("drizzle-orm");
  const result = await db
    .select({
      id: exams.id,
      title: exams.title,
      description: exams.description,
      timeLimit: exams.timeLimit,
      passingScore: exams.passingScore,
      totalScore: exams.totalScore,
      gradingMethod: exams.gradingMethod,
      status: exams.status,
      createdBy: exams.createdBy,
      createdAt: exams.createdAt,
      updatedAt: exams.updatedAt,
      questionCount: sql<number>`COALESCE(COUNT(DISTINCT ${examQuestions.questionId}), 0)`,
    })
    .from(exams)
    .leftJoin(examQuestions, eq(exams.id, examQuestions.examId))
    .where(isNull(exams.deletedAt))
    .groupBy(exams.id)
    .orderBy(desc(exams.createdAt));
  
  return result;
}

/**
 * 根據ID查詢考試
 */
export async function getExamById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { exams } = await import("../drizzle/schema");
  
  const result = await db
    .select()
    .from(exams)
    .where(eq(exams.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 更新考試
 */
export async function updateExam(id: number, data: {
  title?: string;
  description?: string;
  timeLimit?: number;
  passingScore?: number;
  totalScore?: number;
  gradingMethod?: 'auto' | 'manual' | 'mixed';
  status?: 'draft' | 'published' | 'archived';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { exams } = await import("../drizzle/schema");
  
  await db.update(exams).set(data).where(eq(exams.id, id));
}

/**
 * 刪除考試
 */
export async function deleteExam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { exams } = await import("../drizzle/schema");
  
  await db.delete(exams).where(eq(exams.id, id));
}

/**
 * 新增考試題目
 */
export async function addExamQuestion(data: {
  examId: number;
  questionId: number;
  questionOrder: number;
  points: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examQuestions } = await import("../drizzle/schema");
  
  await db.insert(examQuestions).values(data);
}

/**
 * 批次新增考試題目
 */
export async function batchAddExamQuestions(examId: number, questions: Array<{
  questionId: number;
  questionOrder: number;
  points: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { sql } = await import("drizzle-orm");
  
  // 使用原始SQL查詢繞過Drizzle ORM的問題
  for (const q of questions) {
    await db.execute(
      sql.raw(
        `INSERT INTO examQuestions (examId, questionId, questionOrder, points) VALUES (${examId}, ${q.questionId}, ${q.questionOrder}, ${q.points})`
      )
    );
  }
}

/**
 * 查詢考試的所有題目
 */
export async function getExamQuestions(examId: number) {
  const db = await getDb();
  if (!db) return [];
  const { examQuestions, questions } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      id: examQuestions.id,
      examId: examQuestions.examId,
      questionId: examQuestions.questionId,
      questionOrder: examQuestions.questionOrder,
      points: examQuestions.points,
      question: questions,
    })
    .from(examQuestions)
    .leftJoin(questions, eq(examQuestions.questionId, questions.id))
    .where(eq(examQuestions.examId, examId))
    .orderBy(examQuestions.questionOrder);
  
  return result;
}

/**
 * 更新考試題目資訊（分數、順序）
 */
export async function updateExamQuestion(data: {
  examId: number;
  questionId: number;
  points?: number;
  questionOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examQuestions } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  const updateData: any = {};
  if (data.points !== undefined) updateData.points = data.points;
  if (data.questionOrder !== undefined) updateData.questionOrder = data.questionOrder;
  
  if (Object.keys(updateData).length > 0) {
    await db.update(examQuestions)
      .set(updateData)
      .where(
        and(
          eq(examQuestions.examId, data.examId),
          eq(examQuestions.questionId, data.questionId)
        )
      );
  }
}

/**
 * 批次調整考試題目順序
 */
export async function reorderExamQuestions(
  examId: number,
  questionOrders: { questionId: number; questionOrder: number }[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examQuestions } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  // 批次更新每個題目的順序
  for (const { questionId, questionOrder } of questionOrders) {
    await db.update(examQuestions)
      .set({ questionOrder })
      .where(
        and(
          eq(examQuestions.examId, examId),
          eq(examQuestions.questionId, questionId)
        )
      );
  }
}

/**
 * 刪除考試題目
 */
export async function deleteExamQuestion(examId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examQuestions } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  await db.delete(examQuestions).where(
    and(
      eq(examQuestions.examId, examId),
      eq(examQuestions.questionId, questionId)
    )
  );
}

/**
 * 指派考試給使用者
 */
export async function assignExam(data: {
  examId: number;
  userId: number;
  employeeId?: number;
  deadline?: Date;
  isPractice?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examAssignments } = await import("../drizzle/schema");
  
  const result = await db.insert(examAssignments).values({
    examId: data.examId,
    userId: data.userId,
    employeeId: data.employeeId || null,
    deadline: data.deadline || null,
    status: 'pending',
    isPractice: data.isPractice ? 1 : 0,
  });
  
  // 回傳新建的 assignment ID
  const insertId = result[0].insertId;
  const assignment = await db.select().from(examAssignments).where(eq(examAssignments.id, insertId)).limit(1);
  return assignment[0];
}

/**
 * 批次指派考試給多個使用者
 */
export async function batchAssignExam(data: {
  examId: number;
  userIds: number[];
  deadline?: Date;
  isPractice?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examAssignments } = await import("../drizzle/schema");
  
  // 準備批次插入的資料
  const assignments = data.userIds.map(userId => ({
    examId: data.examId,
    userId: userId,
    employeeId: null,
    deadline: data.deadline || null,
    status: 'pending' as const,
    isPractice: data.isPractice ? 1 : 0,
  }));
  
  // 批次插入（分批處理，每批100筆）
  const batchSize = 100;
  for (let i = 0; i < assignments.length; i += batchSize) {
    const batch = assignments.slice(i, i + batchSize);
    await db.insert(examAssignments).values(batch);
  }
  
  return { success: true, count: assignments.length };
}

/**
 * 查詢單一考試指派記錄
 */
export async function getExamAssignmentById(assignmentId: number) {
  const db = await getDb();
  if (!db) return null;
  const { examAssignments } = await import("../drizzle/schema");
  
  const result = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.id, assignmentId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * 查詢使用者的考試指派
 */
export async function getUserExamAssignments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { examAssignments, exams } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      assignment: examAssignments,
      exam: exams,
    })
    .from(examAssignments)
    .leftJoin(exams, eq(examAssignments.examId, exams.id))
    .where(eq(examAssignments.userId, userId))
    .orderBy(desc(examAssignments.assignedAt));
  
  return result;
}

/**
 * 查詢考試的所有指派
 */
export async function getExamAssignments(examId: number) {
  const db = await getDb();
  if (!db) return [];
  const { examAssignments, users } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      assignment: examAssignments,
      user: users,
    })
    .from(examAssignments)
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .where(eq(examAssignments.examId, examId))
    .orderBy(desc(examAssignments.assignedAt));
  
  return result;
}


/**
 * 取得考試詳情和題目列表（考生端）
 */
export async function getExamForTaking(assignmentId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const { exams, examQuestions, questions, examAssignments } = await import("../drizzle/schema");
  
  // 取得考試指派記錄
  const assignment = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.id, assignmentId))
    .limit(1);
  
  if (assignment.length === 0 || assignment[0].userId !== userId) {
    return null; // 找不到指派記錄或不屬於此使用者
  }
  
  const examId = assignment[0].examId;
  
  // 取得考試詳情
  const exam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  
  if (exam.length === 0) {
    return null;
  }
  
  // 取得考試題目列表
  const examQuestionsData = await db
    .select({
      id: examQuestions.id,
      examId: examQuestions.examId,
      questionId: examQuestions.questionId,
      questionOrder: examQuestions.questionOrder,
      points: examQuestions.points,
      question: questions,
    })
    .from(examQuestions)
    .leftJoin(questions, eq(examQuestions.questionId, questions.id))
    .where(eq(examQuestions.examId, examId))
    .orderBy(examQuestions.questionOrder);
  
  // 過濾掉 null 的題目（避免 leftJoin 找不到對應的題目）
  const validQuestions = examQuestionsData.filter(q => q.question !== null);
  
  return {
    exam: exam[0],
    assignment: assignment[0],
    questions: validQuestions,
  };
}

/**
 * 開始考試（更新examAssignment的startTime）
 */
export async function startExam(assignmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examAssignments } = await import("../drizzle/schema");
  
  await db
    .update(examAssignments)
    .set({
      startTime: new Date(),
      status: "in_progress",
    })
    .where(eq(examAssignments.id, assignmentId));
  
  return { success: true };
}

/**
 * 儲存單題答案
 */
export async function saveAnswer(data: {
  assignmentId: number;
  questionId: number;
  answer: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examSubmissions } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  // 檢查是否已經有答案記錄
  const existing = await db
    .select()
    .from(examSubmissions)
    .where(
      and(
        eq(examSubmissions.assignmentId, data.assignmentId),
        eq(examSubmissions.questionId, data.questionId)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // 更新現有答案
    await db
      .update(examSubmissions)
      .set({
        answer: data.answer,
        submittedAt: new Date(),
      })
      .where(eq(examSubmissions.id, existing[0].id));
  } else {
    // 新增答案記錄
    await db.insert(examSubmissions).values({
      assignmentId: data.assignmentId,
      questionId: data.questionId,
      answer: data.answer,
    });
  }
  
  return { success: true };
}

/**
 * 取得考生的作答記錄（包含題目資訊）
 */
export async function getExamSubmissions(assignmentId: number) {
  const db = await getDb();
  if (!db) return [];
  const { examSubmissions, questions } = await import("../drizzle/schema");
  
  // 查詢作答記錄和題目資訊
  const result = await db
    .select({
      id: examSubmissions.id,
      assignmentId: examSubmissions.assignmentId,
      questionId: examSubmissions.questionId,
      answer: examSubmissions.answer,
      isCorrect: examSubmissions.isCorrect,
      score: examSubmissions.score,
      aiEvaluation: examSubmissions.aiEvaluation,
      submittedAt: examSubmissions.submittedAt,
      question: {
        id: questions.id,
        type: questions.type,
        question: questions.question,
        options: questions.options,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        difficulty: questions.difficulty,
      },
    })
    .from(examSubmissions)
    .leftJoin(questions, eq(examSubmissions.questionId, questions.id))
    .where(eq(examSubmissions.assignmentId, assignmentId));
  
  return result;
}

/**
 * 提交考試（更新examAssignment的endTime和status，並自動評分）
 */
export async function submitExam(assignmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examAssignments } = await import("../drizzle/schema");
  
  // 更新考試狀態為已提交
  await db
    .update(examAssignments)
    .set({
      endTime: new Date(),
      status: "submitted",
    })
    .where(eq(examAssignments.id, assignmentId));
  
  // 自動評分
  try {
    const { gradeExam, saveGradingResult } = await import("./grading");
    const gradingResult = await gradeExam(assignmentId);
    await saveGradingResult(assignmentId, gradingResult);
    console.log(`[Grading] Assignment ${assignmentId} graded successfully:`, gradingResult);
  } catch (error) {
    console.error(`[Grading] Failed to grade assignment ${assignmentId}:`, error);
    // 評分失敗不影響提交流程，只記錄錯誤
  }
  
  return { success: true };
}

/**
 * 取得考試成績
 */
export async function getExamScore(assignmentId: number) {
  const db = await getDb();
  if (!db) return null;
  const { examScores } = await import("../drizzle/schema");
  
  const result = await db
    .select()
    .from(examScores)
    .where(eq(examScores.assignmentId, assignmentId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * 儲存考試成績
 */
export async function saveExamScore(data: {
  assignmentId: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: number;
  gradedBy?: number;
  feedback?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examScores } = await import("../drizzle/schema");
  
  // 檢查是否已經有成績記錄
  const existing = await db
    .select()
    .from(examScores)
    .where(eq(examScores.assignmentId, data.assignmentId))
    .limit(1);
  
  if (existing.length > 0) {
    // 更新現有成績
    await db
      .update(examScores)
      .set({
        ...data,
        gradedAt: new Date(),
      })
      .where(eq(examScores.id, existing[0].id));
  } else {
    // 新增成績記錄
    await db.insert(examScores).values({
      ...data,
      gradedAt: new Date(),
    });
  }
  
  return { success: true };
}



// ==================== 考卷範本相關函數 ====================

/**
 * 查詢所有考卷範本
 */
export async function getAllExamTemplates() {
  const db = await getDb();
  if (!db) return [];
  const { examTemplates } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  const result = await db
    .select()
    .from(examTemplates)
    .orderBy(desc(examTemplates.createdAt));
  
  return result;
}

/**
 * 根據ID查詢考卷範本
 */
export async function getExamTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { examTemplates } = await import("../drizzle/schema");
  
  const result = await db
    .select()
    .from(examTemplates)
    .where(eq(examTemplates.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * 建立考卷範本
 */
export async function createExamTemplate(data: {
  name: string;
  description?: string;
  timeLimit?: number;
  passingScore: number;
  gradingMethod: "auto" | "manual" | "mixed";
  createdBy: number;
  questionIds: number[];
  questionPoints: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examTemplates, examTemplateQuestions } = await import("../drizzle/schema");
  
  // 建立範本
  const result = await db.insert(examTemplates).values({
    name: data.name,
    description: data.description,
    timeLimit: data.timeLimit,
    passingScore: data.passingScore,
    gradingMethod: data.gradingMethod,
    createdBy: data.createdBy,
  });
  
  const templateId = Number(result[0].insertId);
  
  // 新增範本題目
  if (data.questionIds.length > 0) {
    const templateQuestions = data.questionIds.map((questionId, index) => ({
      templateId,
      questionId,
      questionOrder: index + 1,
      points: data.questionPoints[index] || 1,
    }));
    
    await db.insert(examTemplateQuestions).values(templateQuestions);
  }
  
  return { id: templateId, success: true };
}

/**
 * 從考卷建立範本
 */
export async function createExamTemplateFromExam(
  examId: number,
  name: string,
  description: string | undefined,
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { exams, examQuestions, examTemplates, examTemplateQuestions } = await import("../drizzle/schema");
  
  // 查詢考卷資訊
  const exam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  
  if (exam.length === 0) {
    throw new Error("找不到考卷");
  }
  
  // 查詢考卷題目
  const questions = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(examQuestions.questionOrder);
  
  // 建立範本
  const result = await db.insert(examTemplates).values({
    name,
    description: description || exam[0].description,
    timeLimit: exam[0].timeLimit,
    passingScore: exam[0].passingScore,
    gradingMethod: exam[0].gradingMethod,
    createdBy,
  });
  
  const templateId = Number(result[0].insertId);
  
  // 複製題目到範本
  if (questions.length > 0) {
    const templateQuestions = questions.map((q) => ({
      templateId,
      questionId: q.questionId,
      questionOrder: q.questionOrder,
      points: q.points,
    }));
    
    await db.insert(examTemplateQuestions).values(templateQuestions);
  }
  
  return { id: templateId, success: true };
}

/**
 * 更新考卷範本
 */
export async function updateExamTemplate(id: number, data: {
  name?: string;
  description?: string;
  timeLimit?: number;
  passingScore?: number;
  gradingMethod?: "auto" | "manual" | "mixed";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examTemplates } = await import("../drizzle/schema");
  
  await db.update(examTemplates).set(data).where(eq(examTemplates.id, id));
  return { success: true };
}

/**
 * 刪除考卷範本
 */
export async function deleteExamTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examTemplates, examTemplateQuestions } = await import("../drizzle/schema");
  
  // 先刪除範本題目
  await db.delete(examTemplateQuestions).where(eq(examTemplateQuestions.templateId, id));
  
  // 再刪除範本
  await db.delete(examTemplates).where(eq(examTemplates.id, id));
  
  return { success: true };
}

/**
 * 從範本建立考卷
 */
export async function createExamFromTemplate(
  templateId: number,
  title: string | undefined,
  description: string | undefined,
  status: "draft" | "published" | "archived",
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { examTemplates, examTemplateQuestions, exams, examQuestions } = await import("../drizzle/schema");
  
  // 查詢範本資訊
  const template = await db
    .select()
    .from(examTemplates)
    .where(eq(examTemplates.id, templateId))
    .limit(1);
  
  if (template.length === 0) {
    throw new Error("找不到範本");
  }
  
  // 查詢範本題目
  const questions = await db
    .select()
    .from(examTemplateQuestions)
    .where(eq(examTemplateQuestions.templateId, templateId))
    .orderBy(examTemplateQuestions.questionOrder);
  
  // 計算總分
  const totalScore = questions.reduce((sum, q) => sum + q.points, 0);
  
  // 建立考卷
  const result = await db.insert(exams).values({
    title: title || template[0].name,
    description: description || template[0].description,
    timeLimit: template[0].timeLimit,
    passingScore: template[0].passingScore,
    totalScore,
    gradingMethod: template[0].gradingMethod,
    status,
    createdBy,
  });
  
  const examId = Number(result[0].insertId);
  
  // 複製題目到考卷
  if (questions.length > 0) {
    const examQuestionsData = questions.map((q) => ({
      examId,
      questionId: q.questionId,
      questionOrder: q.questionOrder,
      points: q.points,
    }));
    
    await db.insert(examQuestions).values(examQuestionsData);
  }
  
  return { 
    id: examId, 
    success: true,
    questionCount: questions.length,
    totalScore,
  };
}

/**
 * 查詢範本的所有題目
 */
export async function getExamTemplateQuestions(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  const { examTemplateQuestions, questions } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      templateQuestionId: examTemplateQuestions.id,
      questionId: examTemplateQuestions.questionId,
      questionOrder: examTemplateQuestions.questionOrder,
      points: examTemplateQuestions.points,
      type: questions.type,
      content: questions.content,
      difficulty: questions.difficulty,
      categoryId: questions.categoryId,
    })
    .from(examTemplateQuestions)
    .leftJoin(questions, eq(examTemplateQuestions.questionId, questions.id))
    .where(eq(examTemplateQuestions.templateId, templateId))
    .orderBy(examTemplateQuestions.questionOrder);
  
  return result;
}



/**
 * 編輯者權限控制相關函數
 */

/**
 * 設定編輯者可訪問的部門
 */
export async function setEditorDepartmentAccess(editorId: number, departmentIds: number[], createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { editorDepartmentAccess } = await import("../drizzle/schema");
  
  // 先刪除該編輯者的所有部門權限
  await db.delete(editorDepartmentAccess).where(eq(editorDepartmentAccess.editorId, editorId));
  
  // 新增新的部門權限
  if (departmentIds.length > 0) {
    const accessData = departmentIds.map(deptId => ({
      editorId,
      departmentId: deptId,
      createdBy,
    }));
    await db.insert(editorDepartmentAccess).values(accessData);
  }
  
  return { success: true };
}

/**
 * 設定編輯者可訪問的考生
 */
export async function setEditorUserAccess(editorId: number, userIds: number[], createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { editorUserAccess } = await import("../drizzle/schema");
  
  // 先刪除該編輯者的所有考生權限
  await db.delete(editorUserAccess).where(eq(editorUserAccess.editorId, editorId));
  
  // 新增新的考生權限
  if (userIds.length > 0) {
    const accessData = userIds.map(userId => ({
      editorId,
      userId,
      createdBy,
    }));
    await db.insert(editorUserAccess).values(accessData);
  }
  
  return { success: true };
}

/**
 * 查詢編輯者可訪問的部門列表
 */
export async function getEditorDepartmentAccess(editorId: number) {
  const db = await getDb();
  if (!db) return [];
  const { editorDepartmentAccess, departments } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      accessId: editorDepartmentAccess.id,
      departmentId: editorDepartmentAccess.departmentId,
      departmentName: departments.name,
    })
    .from(editorDepartmentAccess)
    .leftJoin(departments, eq(editorDepartmentAccess.departmentId, departments.id))
    .where(eq(editorDepartmentAccess.editorId, editorId));
  
  return result;
}

/**
 * 查詢編輯者可訪問的考生列表
 */
export async function getEditorUserAccess(editorId: number) {
  const db = await getDb();
  if (!db) return [];
  const { editorUserAccess, users } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      accessId: editorUserAccess.id,
      userId: editorUserAccess.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(editorUserAccess)
    .leftJoin(users, eq(editorUserAccess.userId, users.id))
    .where(eq(editorUserAccess.editorId, editorId));
  
  return result;
}

/**
 * 查詢編輯者可訪問的所有考生ID列表（部門 + 特定考生）
 */
export async function getAccessibleUserIds(editorId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const { editorDepartmentAccess, editorUserAccess, employees, users } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");
  
  // 1. 查詢編輯者可訪問的部門ID
  const deptAccess = await db
    .select({ departmentId: editorDepartmentAccess.departmentId })
    .from(editorDepartmentAccess)
    .where(eq(editorDepartmentAccess.editorId, editorId));
  
  const departmentIds = deptAccess.map(d => d.departmentId);
  
  // 2. 查詢這些部門的所有人員
  let userIdsFromDepts: number[] = [];
  if (departmentIds.length > 0) {
    const employeesInDepts = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(inArray(employees.departmentId, departmentIds));
    
    // 3. 根據人員姓名查詢對應的使用者ID（假設姓名匹配）
    const employeeNames = employeesInDepts.map(e => e.name);
    if (employeeNames.length > 0) {
      const usersInDepts = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.name, employeeNames));
      
      userIdsFromDepts = usersInDepts.map(u => u.id);
    }
  }
  
  // 4. 查詢編輯者可訪問的特定考生ID
  const userAccess = await db
    .select({ userId: editorUserAccess.userId })
    .from(editorUserAccess)
    .where(eq(editorUserAccess.editorId, editorId));
  
  const specificUserIds = userAccess.map(u => u.userId);
  
  // 5. 合併並去重
  const allUserIds = Array.from(new Set([...userIdsFromDepts, ...specificUserIds]));
  
  return allUserIds;
}

/**
 * 檢查編輯者是否有權訪問特定考生
 */
export async function canEditorAccessUser(editorId: number, userId: number): Promise<boolean> {
  const accessibleUserIds = await getAccessibleUserIds(editorId);
  return accessibleUserIds.includes(userId);
}

/**
 * 查詢所有考試指派（管理者/編輯者專用，含權限過濾）
 */
export async function getAllExamAssignments(userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return [];
  const { examAssignments, exams, users } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");
  
  // 管理員可以看到所有考試指派
  if (userRole === 'admin') {
    const result = await db
      .select({
        assignment: examAssignments,
        exam: exams,
        user: users,
      })
      .from(examAssignments)
      .leftJoin(exams, eq(examAssignments.examId, exams.id))
      .leftJoin(users, eq(examAssignments.userId, users.id))
      .orderBy(desc(examAssignments.assignedAt));
    
    return result;
  }
  
  // 編輯者只能看到自己有權訪問的考生的考試指派
  if (userRole === 'editor') {
    const accessibleUserIds = await getAccessibleUserIds(userId);
    
    if (accessibleUserIds.length === 0) {
      return [];
    }
    
    const result = await db
      .select({
        assignment: examAssignments,
        exam: exams,
        user: users,
      })
      .from(examAssignments)
      .leftJoin(exams, eq(examAssignments.examId, exams.id))
      .leftJoin(users, eq(examAssignments.userId, users.id))
      .where(inArray(examAssignments.userId, accessibleUserIds))
      .orderBy(desc(examAssignments.assignedAt));
    
    return result;
  }
  
  // 其他角色無權訪問
  return [];
}



export async function updateUserName(openId: string, name: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.update(users)
    .set({ name })
    .where(eq(users.openId, openId));
}



export async function batchCreateEmployees(employeesData: Array<{ name: string; departmentId: number; email?: string | null }>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const results = [];
  for (const empData of employeesData) {
    const result = await db.insert(employees).values({
      name: empData.name,
      departmentId: empData.departmentId,
      email: empData.email || null,
    });
    results.push(result);
  }
  
  return { success: true, count: results.length };
}



// ==================== 逾期通知自動化相關函數 ====================

/**
 * 檢查逾期考試並建立通知記錄
 * 分級通知：逾期1天、3天、7天
 */
export async function checkAndCreateOverdueNotifications() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examAssignments, exams, users, overdueNotifications, notifications } = await import("../drizzle/schema");
  const { and, lt } = await import("drizzle-orm");

  const now = new Date();
  
  // 查詢所有逾期且未完成的考試指派
  const overdueAssignments = await db
    .select({
      assignmentId: examAssignments.id,
      examId: examAssignments.examId,
      userId: examAssignments.userId,
      deadline: examAssignments.deadline,
      examTitle: exams.title,
      userName: users.name,
      userEmail: users.email,
    })
    .from(examAssignments)
    .leftJoin(exams, eq(examAssignments.examId, exams.id))
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .where(
      and(
        eq(examAssignments.status, "assigned"),
        lt(examAssignments.deadline, now)
      )
    );

  const notificationsToCreate = [];
  
  for (const assignment of overdueAssignments) {
    if (!assignment.deadline) continue;
    
    const overdueDays = Math.floor((now.getTime() - assignment.deadline.getTime()) / (1000 * 60 * 60 * 24));
    
    // 判斷通知級別
    let notificationLevel: "day_1" | "day_3" | "day_7" | null = null;
    if (overdueDays >= 7) {
      notificationLevel = "day_7";
    } else if (overdueDays >= 3) {
      notificationLevel = "day_3";
    } else if (overdueDays >= 1) {
      notificationLevel = "day_1";
    }
    
    if (!notificationLevel) continue;
    
    // 檢查是否已發送過此級別的通知
    const existingNotification = await db
      .select()
      .from(overdueNotifications)
      .where(
        and(
          eq(overdueNotifications.assignmentId, assignment.assignmentId),
          eq(overdueNotifications.notificationLevel, notificationLevel),
          eq(overdueNotifications.notificationSent, 1)
        )
      )
      .limit(1);
    
    if (existingNotification.length > 0) {
      continue; // 已發送過此級別的通知，跳過
    }
    
    // 建立通知記錄
    const notificationContent = `您的考試「${assignment.examTitle}」已逾期 ${overdueDays} 天，請盡快完成考試。`;
    
    notificationsToCreate.push({
      assignmentId: assignment.assignmentId,
      examId: assignment.examId,
      userId: assignment.userId,
      notificationLevel,
      notificationSent: 0,
      overdueBy: overdueDays,
      deadline: assignment.deadline,
      notificationContent,
    });
  }
  
  // 批次建立通知記錄
  if (notificationsToCreate.length > 0) {
    await db.insert(overdueNotifications).values(notificationsToCreate);
  }
  
  return {
    success: true,
    notificationsCreated: notificationsToCreate.length,
    overdueAssignments: overdueAssignments.length,
  };
}

/**
 * 發送逾期通知（整合現有通知系統）
 */
export async function sendOverdueNotifications() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { overdueNotifications, exams, users, notifications } = await import("../drizzle/schema");

  // 查詢未發送的通知記錄
  const pendingNotifications = await db
    .select({
      notificationId: overdueNotifications.id,
      assignmentId: overdueNotifications.assignmentId,
      examId: overdueNotifications.examId,
      userId: overdueNotifications.userId,
      notificationLevel: overdueNotifications.notificationLevel,
      notificationContent: overdueNotifications.notificationContent,
      overdueBy: overdueNotifications.overdueBy,
      examTitle: exams.title,
      userName: users.name,
      userEmail: users.email,
    })
    .from(overdueNotifications)
    .leftJoin(exams, eq(overdueNotifications.examId, exams.id))
    .leftJoin(users, eq(overdueNotifications.userId, users.id))
    .where(eq(overdueNotifications.notificationSent, 0))
    .limit(100); // 每次最多發送100條通知

  const notificationsSent = [];
  
  for (const notification of pendingNotifications) {
    try {
      // 建立系統通知記錄
      await db.insert(notifications).values({
        userId: notification.userId,
        notificationType: "other",
        title: `考試逾期提醒（逾期 ${notification.overdueBy} 天）`,
        content: notification.notificationContent || "",
        relatedExamId: notification.examId,
        relatedAssignmentId: notification.assignmentId,
        isRead: 0,
      });
      
      // 標記為已發送
      await db
        .update(overdueNotifications)
        .set({
          notificationSent: 1,
          sentAt: new Date(),
        })
        .where(eq(overdueNotifications.id, notification.notificationId));
      
      notificationsSent.push(notification.notificationId);
    } catch (error) {
      console.error(`Failed to send notification ${notification.notificationId}:`, error);
    }
  }
  
  return {
    success: true,
    notificationsSent: notificationsSent.length,
    pendingNotifications: pendingNotifications.length,
  };
}

/**
 * 查詢逾期通知歷史記錄
 */
export async function getOverdueNotificationHistory(filters?: {
  userId?: number;
  examId?: number;
  notificationLevel?: "day_1" | "day_3" | "day_7";
  limit?: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { overdueNotifications, exams, users } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");

  let query = db
    .select({
      id: overdueNotifications.id,
      assignmentId: overdueNotifications.assignmentId,
      examId: overdueNotifications.examId,
      examTitle: exams.title,
      userId: overdueNotifications.userId,
      userName: users.name,
      userEmail: users.email,
      notificationLevel: overdueNotifications.notificationLevel,
      notificationSent: overdueNotifications.notificationSent,
      sentAt: overdueNotifications.sentAt,
      overdueBy: overdueNotifications.overdueBy,
      deadline: overdueNotifications.deadline,
      notificationContent: overdueNotifications.notificationContent,
      createdAt: overdueNotifications.createdAt,
    })
    .from(overdueNotifications)
    .leftJoin(exams, eq(overdueNotifications.examId, exams.id))
    .leftJoin(users, eq(overdueNotifications.userId, users.id))
    .$dynamic();

  const conditions = [];
  
  if (filters?.userId) {
    conditions.push(eq(overdueNotifications.userId, filters.userId));
  }
  
  if (filters?.examId) {
    conditions.push(eq(overdueNotifications.examId, filters.examId));
  }
  
  if (filters?.notificationLevel) {
    conditions.push(eq(overdueNotifications.notificationLevel, filters.notificationLevel));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  const result = await query
    .orderBy(desc(overdueNotifications.createdAt))
    .limit(filters?.limit || 100);
  
  return result;
}

/**
 * 取得逾期通知統計資料
 */
export async function getOverdueNotificationStats() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { overdueNotifications } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  // 統計各級別的通知數量
  const stats = await db
    .select({
      notificationLevel: overdueNotifications.notificationLevel,
      totalCount: sql<number>`COUNT(*)`,
      sentCount: sql<number>`SUM(CASE WHEN ${overdueNotifications.notificationSent} = 1 THEN 1 ELSE 0 END)`,
      pendingCount: sql<number>`SUM(CASE WHEN ${overdueNotifications.notificationSent} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(overdueNotifications)
    .groupBy(overdueNotifications.notificationLevel);
  
  return stats;
}



// ==================== 補考自動安排相關函數 ====================

/**
 * 自動為逾期考試建立補考記錄
 * 整合現有的 makeupExams 表格
 */
export async function autoScheduleMakeupExams(options?: {
  maxMakeupAttempts?: number;
  makeupDaysAfterOverdue?: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examAssignments, exams, users, makeupExams, overdueExamActions } = await import("../drizzle/schema");
  const { and, lt, isNull } = await import("drizzle-orm");

  const now = new Date();
  const maxAttempts = options?.maxMakeupAttempts || 2; // 預設最多補考2次
  const makeupDays = options?.makeupDaysAfterOverdue || 7; // 預設逾期後7天內完成補考
  
  // 查詢所有逾期且未完成的考試指派（尚未建立補考記錄）
  const overdueAssignments = await db
    .select({
      assignmentId: examAssignments.id,
      examId: examAssignments.examId,
      userId: examAssignments.userId,
      deadline: examAssignments.deadline,
      examTitle: exams.title,
      userName: users.name,
    })
    .from(examAssignments)
    .leftJoin(exams, eq(examAssignments.examId, exams.id))
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .where(
      and(
        eq(examAssignments.status, "assigned"),
        lt(examAssignments.deadline, now)
      )
    );

  const makeupRecordsToCreate = [];
  const actionsToRecord = [];
  
  for (const assignment of overdueAssignments) {
    // 檢查是否已建立補考記錄
    const existingMakeup = await db
      .select()
      .from(makeupExams)
      .where(
        and(
          eq(makeupExams.originalAssignmentId, assignment.assignmentId),
          eq(makeupExams.userId, assignment.userId)
        )
      )
      .limit(1);
    
    if (existingMakeup.length > 0) {
      continue; // 已建立補考記錄，跳過
    }
    
    // 計算補考截止日期
    const makeupDeadline = new Date(now.getTime() + makeupDays * 24 * 60 * 60 * 1000);
    
    // 建立補考記錄
    makeupRecordsToCreate.push({
      originalAssignmentId: assignment.assignmentId,
      userId: assignment.userId,
      examId: assignment.examId,
      makeupCount: 1,
      maxMakeupAttempts: maxAttempts,
      makeupDeadline,
      status: "pending" as const,
      reason: "考試逾期未完成，系統自動安排補考",
      scheduledBy: null, // null 表示系統自動安排
    });
    
    // 記錄處理動作
    actionsToRecord.push({
      assignmentId: assignment.assignmentId,
      examId: assignment.examId,
      userId: assignment.userId,
      actionType: "makeup_scheduled" as const,
      actionDetails: JSON.stringify({
        makeupDeadline: makeupDeadline.toISOString(),
        maxAttempts,
        autoScheduled: true,
      }),
      overdueBy: assignment.deadline ? Math.floor((now.getTime() - assignment.deadline.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      originalDeadline: assignment.deadline,
      performedBy: null, // null 表示系統自動
    });
  }
  
  // 批次建立補考記錄
  if (makeupRecordsToCreate.length > 0) {
    await db.insert(makeupExams).values(makeupRecordsToCreate);
  }
  
  // 批次記錄處理動作
  if (actionsToRecord.length > 0) {
    await db.insert(overdueExamActions).values(actionsToRecord);
  }
  
  return {
    success: true,
    makeupRecordsCreated: makeupRecordsToCreate.length,
    overdueAssignments: overdueAssignments.length,
  };
}

/**
 * 查詢補考記錄（包含逾期考試的補考資訊）
 */
export async function getMakeupExamsWithOverdueInfo(filters?: {
  userId?: number;
  examId?: number;
  status?: "pending" | "scheduled" | "completed" | "expired";
  limit?: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { makeupExams, examAssignments, exams, users } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");

  let query = db
    .select({
      id: makeupExams.id,
      originalAssignmentId: makeupExams.originalAssignmentId,
      makeupAssignmentId: makeupExams.makeupAssignmentId,
      userId: makeupExams.userId,
      userName: users.name,
      userEmail: users.email,
      examId: makeupExams.examId,
      examTitle: exams.title,
      makeupCount: makeupExams.makeupCount,
      maxMakeupAttempts: makeupExams.maxMakeupAttempts,
      makeupDeadline: makeupExams.makeupDeadline,
      status: makeupExams.status,
      originalScore: makeupExams.originalScore,
      makeupScore: makeupExams.makeupScore,
      reason: makeupExams.reason,
      notes: makeupExams.notes,
      scheduledBy: makeupExams.scheduledBy,
      createdAt: makeupExams.createdAt,
      updatedAt: makeupExams.updatedAt,
      // 原始考試指派資訊
      originalDeadline: examAssignments.deadline,
      originalStatus: examAssignments.status,
    })
    .from(makeupExams)
    .leftJoin(exams, eq(makeupExams.examId, exams.id))
    .leftJoin(users, eq(makeupExams.userId, users.id))
    .leftJoin(examAssignments, eq(makeupExams.originalAssignmentId, examAssignments.id))
    .$dynamic();

  const conditions = [];
  
  if (filters?.userId) {
    conditions.push(eq(makeupExams.userId, filters.userId));
  }
  
  if (filters?.examId) {
    conditions.push(eq(makeupExams.examId, filters.examId));
  }
  
  if (filters?.status) {
    conditions.push(eq(makeupExams.status, filters.status));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  const result = await query
    .orderBy(desc(makeupExams.createdAt))
    .limit(filters?.limit || 100);
  
  return result;
}

/**
 * 更新補考狀態（當補考指派建立後）
 */
export async function updateMakeupExamStatus(
  makeupExamId: number,
  status: "pending" | "scheduled" | "completed" | "expired",
  makeupAssignmentId?: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { makeupExams } = await import("../drizzle/schema");

  const updateData: any = { status };
  
  if (makeupAssignmentId) {
    updateData.makeupAssignmentId = makeupAssignmentId;
  }
  
  await db
    .update(makeupExams)
    .set(updateData)
    .where(eq(makeupExams.id, makeupExamId));
  
  return { success: true };
}

/**
 * 檢查補考是否逾期，自動更新狀態
 */
export async function checkExpiredMakeupExams() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { makeupExams } = await import("../drizzle/schema");
  const { and, lt, or } = await import("drizzle-orm");

  const now = new Date();
  
  // 查詢所有逾期且狀態為 pending 或 scheduled 的補考記錄
  const expiredMakeups = await db
    .select()
    .from(makeupExams)
    .where(
      and(
        or(
          eq(makeupExams.status, "pending"),
          eq(makeupExams.status, "scheduled")
        ),
        lt(makeupExams.makeupDeadline, now)
      )
    );
  
  // 批次更新狀態為 expired
  if (expiredMakeups.length > 0) {
    for (const makeup of expiredMakeups) {
      await db
        .update(makeupExams)
        .set({ status: "expired" })
        .where(eq(makeupExams.id, makeup.id));
    }
  }
  
  return {
    success: true,
    expiredCount: expiredMakeups.length,
  };
}

/**
 * 取得補考統計資料
 */
export async function getMakeupExamStats() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { makeupExams } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  // 統計各狀態的補考數量
  const stats = await db
    .select({
      status: makeupExams.status,
      totalCount: sql<number>`COUNT(*)`,
      avgMakeupCount: sql<number>`AVG(${makeupExams.makeupCount})`,
    })
    .from(makeupExams)
    .groupBy(makeupExams.status);
  
  return stats;
}



// ==================== 考試規劃範本相關函數 ====================

/**
 * 建立考試規劃範本
 */
export async function createExamPlanningTemplate(data: {
  name: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  createdBy: number;
  items: Array<{
    examId: number;
    orderIndex: number;
    daysFromStart: number;
    durationDays: number;
    notes?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examPlanningTemplates, examPlanningTemplateItems } = await import("../drizzle/schema");

  // 建立範本
  const [result] = await db.insert(examPlanningTemplates).values({
    name: data.name,
    description: data.description,
    category: data.category,
    isPublic: data.isPublic ? 1 : 0,
    createdBy: data.createdBy,
  });

  const templateId = Number(result.insertId);

  // 建立範本項目
  if (data.items && data.items.length > 0) {
    const itemsToInsert = data.items.map(item => ({
      templateId,
      examId: item.examId,
      orderIndex: item.orderIndex,
      daysFromStart: item.daysFromStart,
      durationDays: item.durationDays,
      notes: item.notes,
    }));

    await db.insert(examPlanningTemplateItems).values(itemsToInsert);
  }

  return { success: true, templateId };
}

/**
 * 查詢所有考試規劃範本
 */
export async function getExamPlanningTemplates(filters?: {
  category?: string;
  createdBy?: number;
  isPublic?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examPlanningTemplates, users } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");

  let query = db
    .select({
      id: examPlanningTemplates.id,
      name: examPlanningTemplates.name,
      description: examPlanningTemplates.description,
      category: examPlanningTemplates.category,
      isPublic: examPlanningTemplates.isPublic,
      createdBy: examPlanningTemplates.createdBy,
      creatorName: users.name,
      createdAt: examPlanningTemplates.createdAt,
      updatedAt: examPlanningTemplates.updatedAt,
    })
    .from(examPlanningTemplates)
    .leftJoin(users, eq(examPlanningTemplates.createdBy, users.id))
    .$dynamic();

  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(examPlanningTemplates.category, filters.category));
  }

  if (filters?.createdBy) {
    conditions.push(eq(examPlanningTemplates.createdBy, filters.createdBy));
  }

  if (filters?.isPublic !== undefined) {
    conditions.push(eq(examPlanningTemplates.isPublic, filters.isPublic ? 1 : 0));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query.orderBy(desc(examPlanningTemplates.createdAt));

  return result;
}

/**
 * 查詢範本詳情（包含所有項目）
 */
export async function getExamPlanningTemplateDetail(templateId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examPlanningTemplates, examPlanningTemplateItems, exams, users } = await import("../drizzle/schema");

  // 查詢範本基本資訊
  const [template] = await db
    .select({
      id: examPlanningTemplates.id,
      name: examPlanningTemplates.name,
      description: examPlanningTemplates.description,
      category: examPlanningTemplates.category,
      isPublic: examPlanningTemplates.isPublic,
      createdBy: examPlanningTemplates.createdBy,
      creatorName: users.name,
      createdAt: examPlanningTemplates.createdAt,
      updatedAt: examPlanningTemplates.updatedAt,
    })
    .from(examPlanningTemplates)
    .leftJoin(users, eq(examPlanningTemplates.createdBy, users.id))
    .where(eq(examPlanningTemplates.id, templateId))
    .limit(1);

  if (!template) {
    throw new Error("Template not found");
  }

  // 查詢範本項目
  const items = await db
    .select({
      id: examPlanningTemplateItems.id,
      examId: examPlanningTemplateItems.examId,
      examTitle: exams.title,
      examDescription: exams.description,
      orderIndex: examPlanningTemplateItems.orderIndex,
      daysFromStart: examPlanningTemplateItems.daysFromStart,
      durationDays: examPlanningTemplateItems.durationDays,
      notes: examPlanningTemplateItems.notes,
      createdAt: examPlanningTemplateItems.createdAt,
    })
    .from(examPlanningTemplateItems)
    .leftJoin(exams, eq(examPlanningTemplateItems.examId, exams.id))
    .where(eq(examPlanningTemplateItems.templateId, templateId))
    .orderBy(examPlanningTemplateItems.orderIndex);

  return {
    ...template,
    items,
  };
}

/**
 * 更新考試規劃範本
 */
export async function updateExamPlanningTemplate(
  templateId: number,
  data: {
    name?: string;
    description?: string;
    category?: string;
    isPublic?: boolean;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examPlanningTemplates } = await import("../drizzle/schema");

  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic ? 1 : 0;

  await db
    .update(examPlanningTemplates)
    .set(updateData)
    .where(eq(examPlanningTemplates.id, templateId));

  return { success: true };
}

/**
 * 刪除考試規劃範本
 */
export async function deleteExamPlanningTemplate(templateId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examPlanningTemplates, examPlanningTemplateItems } = await import("../drizzle/schema");

  // 刪除範本項目
  await db
    .delete(examPlanningTemplateItems)
    .where(eq(examPlanningTemplateItems.templateId, templateId));

  // 刪除範本
  await db
    .delete(examPlanningTemplates)
    .where(eq(examPlanningTemplates.id, templateId));

  return { success: true };
}

/**
 * 從範本建立考試規劃（批次指派考試）
 */
export async function createPlanningFromTemplate(data: {
  templateId: number;
  userIds: number[];
  startDate: Date;
  createdBy: number;
  batchName?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { examPlanningTemplates, examPlanningTemplateItems, examAssignments, examPlanningBatches } = await import("../drizzle/schema");

  // 查詢範本詳情
  const [template] = await db
    .select()
    .from(examPlanningTemplates)
    .where(eq(examPlanningTemplates.id, data.templateId))
    .limit(1);

  if (!template) {
    throw new Error("Template not found");
  }

  // 查詢範本項目
  const items = await db
    .select()
    .from(examPlanningTemplateItems)
    .where(eq(examPlanningTemplateItems.templateId, data.templateId))
    .orderBy(examPlanningTemplateItems.orderIndex);

  if (items.length === 0) {
    throw new Error("Template has no items");
  }

  // 建立批次記錄
  const [batchResult] = await db.insert(examPlanningBatches).values({
    batchName: data.batchName || `${template.name} - ${new Date().toLocaleDateString()}`,
    totalUsers: data.userIds.length,
    totalExams: items.length,
    totalAssignments: data.userIds.length * items.length,
    successCount: 0,
    failureCount: 0,
    status: "processing",
    createdBy: data.createdBy,
  });

  const batchId = Number(batchResult.insertId);

  // 建立考試指派
  const assignmentsToCreate = [];
  let successCount = 0;
  let failureCount = 0;

  for (const userId of data.userIds) {
    for (const item of items) {
      try {
        const startTime = new Date(data.startDate.getTime() + item.daysFromStart * 24 * 60 * 60 * 1000);
        const deadline = new Date(startTime.getTime() + item.durationDays * 24 * 60 * 60 * 1000);

        assignmentsToCreate.push({
          examId: item.examId,
          userId,
          startTime,
          deadline,
          status: "assigned" as const,
          assignedBy: data.createdBy,
          batchId,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to create assignment for user ${userId}, exam ${item.examId}:`, error);
        failureCount++;
      }
    }
  }

  // 批次插入考試指派
  if (assignmentsToCreate.length > 0) {
    await db.insert(examAssignments).values(assignmentsToCreate);
  }

  // 更新批次記錄
  await db
    .update(examPlanningBatches)
    .set({
      successCount,
      failureCount,
      status: "completed",
    })
    .where(eq(examPlanningBatches.id, batchId));

  return {
    success: true,
    batchId,
    successCount,
    failureCount,
    totalAssignments: assignmentsToCreate.length,
  };
}

/**
 * 匯出範本為 JSON
 */
export async function exportTemplateAsJSON(templateId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const templateDetail = await getExamPlanningTemplateDetail(templateId);

  return {
    version: "1.0",
    template: templateDetail,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * 從 JSON 匯入範本
 */
export async function importTemplateFromJSON(jsonData: any, createdBy: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  if (!jsonData.template || !jsonData.template.name) {
    throw new Error("Invalid template JSON format");
  }

  const template = jsonData.template;

  // 建立範本
  const result = await createExamPlanningTemplate({
    name: template.name,
    description: template.description,
    category: template.category,
    isPublic: template.isPublic === 1,
    createdBy,
    items: template.items.map((item: any) => ({
      examId: item.examId,
      orderIndex: item.orderIndex,
      daysFromStart: item.daysFromStart,
      durationDays: item.durationDays,
      notes: item.notes,
    })),
  });

  return result;
}

