import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "editor", "viewer", "examinee"]).default("examinee").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 部門表格
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * 人員表格
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  departmentId: int("departmentId").notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * 檔案表格
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId"),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  uploadDate: timestamp("uploadDate").notNull(),
  extractedText: text("extractedText"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * AI分析結果表格
 */
export const analysisResults = mysqlTable("analysisResults", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  analysisType: varchar("analysisType", { length: 50 }).notNull(),
  result: text("result").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = typeof analysisResults.$inferInsert;

/**
 * 檔案閱讀記錄表格
 */
export const fileReadLogs = mysqlTable("fileReadLogs", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  userId: int("userId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
});

export type FileReadLog = typeof fileReadLogs.$inferSelect;
export type InsertFileReadLog = typeof fileReadLogs.$inferInsert;

/**
 * 題目分類表格（支援多層級樹狀結構）
 */
export const questionCategories = mysqlTable("questionCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: int("parentId"), // 父分類 ID，null 表示根分類
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuestionCategory = typeof questionCategories.$inferSelect;
export type InsertQuestionCategory = typeof questionCategories.$inferInsert;

/**
 * 標籤表格
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 20 }), // 標籤顏色（例如：#3b82f6）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * 題目-標籤關聯表（多對多）
 */
export const questionTags = mysqlTable("questionTags", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionTag = typeof questionTags.$inferSelect;
export type InsertQuestionTag = typeof questionTags.$inferInsert;

/**
 * 題庫表格
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId"),
  type: mysqlEnum("type", ["true_false", "multiple_choice", "short_answer"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  question: text("question").notNull(),
  options: text("options"), // JSON格式儲存選項（僅選擇題使用）
  correctAnswer: text("correctAnswer").notNull(),
  explanation: text("explanation"),
  // tags 欄位已移除，改用 questionTags 關聯表
  source: varchar("source", { length: 255 }), // 考題出處（檔案名稱或手動輸入）
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

/**
 * 題庫檔案表格（用於組織和管理題目集合）
 */
export const questionBanks = mysqlTable("questionBanks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // 題庫檔案名稱
  description: text("description"), // 描述
  tags: text("tags"), // JSON格式儲存標籤陣列
  source: varchar("source", { length: 255 }), // 來源（匯入檔案名或手動建立）
  questionCount: int("questionCount").default(0).notNull(), // 題目數量
  createdBy: int("createdBy").notNull(), // 建立者用戶ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuestionBank = typeof questionBanks.$inferSelect;
export type InsertQuestionBank = typeof questionBanks.$inferInsert;

/**
 * 題庫檔案-題目關聯表（多對多）
 */
export const questionBankItems = mysqlTable("questionBankItems", {
  id: int("id").autoincrement().primaryKey(),
  bankId: int("bankId").notNull(), // 題庫檔案ID
  questionId: int("questionId").notNull(), // 題目ID
  order: int("order").default(0).notNull(), // 題目順序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionBankItem = typeof questionBankItems.$inferSelect;
export type InsertQuestionBankItem = typeof questionBankItems.$inferInsert;

/**
 * AI分析歷史記錄表格（記錄每次AI分析的結果）
 */
export const analysisHistory = mysqlTable("analysisHistory", {
  id: int("id").autoincrement().primaryKey(),
  analysisType: varchar("analysisType", { length: 50 }).notNull(), // 分析類型（generate_questions, analyze_questions, other）
  analysisMode: varchar("analysisMode", { length: 50 }).notNull(), // 分析模式（file_only, external_info, comprehensive）
  prompt: text("prompt"), // 使用者提示詞
  fileIds: text("fileIds").notNull(), // 相關檔案ID（JSON陣列）
  fileNames: text("fileNames"), // 檔案名稱列表（JSON陣列，方便顯示）
  result: text("result").notNull(), // 分析結果（JSON格式）
  createdBy: int("createdBy").notNull(), // 執行分析的使用者ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisHistory = typeof analysisHistory.$inferSelect;
export type InsertAnalysisHistory = typeof analysisHistory.$inferInsert;

/**
 * 考核記錄表格（保留給考試系統使用）
 */
export const assessmentRecords = mysqlTable("assessmentRecords", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(), // 受考人員ID
  analysisType: varchar("analysisType", { length: 50 }).notNull(), // 分析類型（generate_questions, analyze_questions, other）
  score: int("score"), // 分數（如果有）
  result: text("result").notNull(), // 分析結果（JSON格式）
  fileIds: text("fileIds"), // 相關檔案ID（JSON陣列）
  createdBy: int("createdBy").notNull(), // 執行分析的使用者ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssessmentRecord = typeof assessmentRecords.$inferSelect;
export type InsertAssessmentRecord = typeof assessmentRecords.$inferInsert;

/**
 * 考試表格
 */
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  timeLimit: int("timeLimit"), // 時間限制（分鐘），null表示不限時
  passingScore: int("passingScore").notNull(), // 及格分數
  totalScore: int("totalScore").notNull(), // 總分
  gradingMethod: mysqlEnum("gradingMethod", ["auto", "manual", "mixed"]).notNull().default("auto"), // 評分方式：自動、人工、混合
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"), // 考試狀態
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

/**
 * 考試題目關聯表格
 */
export const examQuestions = mysqlTable("examQuestions", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  questionId: int("questionId").notNull(),
  questionOrder: int("questionOrder").notNull(), // 題目順序
  points: int("points").notNull(), // 該題分數
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamQuestion = typeof examQuestions.$inferSelect;
export type InsertExamQuestion = typeof examQuestions.$inferInsert;

/**
 * 考試指派表格
 */
export const examAssignments = mysqlTable("examAssignments", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  userId: int("userId").notNull(), // 考生的user ID
  employeeId: int("employeeId"), // 考生的employee ID（如果有）
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  startTime: timestamp("startTime"), // 考試開始時間（null表示未開始）
  endTime: timestamp("endTime"), // 考試結束時間（null表示未結束）
  deadline: timestamp("deadline"), // 截止時間（null表示不限期）
  status: mysqlEnum("status", ["pending", "in_progress", "submitted", "graded"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExamAssignment = typeof examAssignments.$inferSelect;
export type InsertExamAssignment = typeof examAssignments.$inferInsert;

/**
 * 考試作答記錄表格
 */
export const examSubmissions = mysqlTable("examSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(), // 關聯到examAssignments
  questionId: int("questionId").notNull(),
  answer: text("answer").notNull(), // 考生的答案
  isCorrect: int("isCorrect"), // 是否正確（1=正確，0=錯誤，null=待評分）
  score: int("score"), // 該題得分（null表示未評分）
  aiEvaluation: text("aiEvaluation"), // AI評分結果（JSON格式，包含評分理由）
  teacherComment: text("teacherComment"), // 教師評語（人工評分時使用）
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExamSubmission = typeof examSubmissions.$inferSelect;
export type InsertExamSubmission = typeof examSubmissions.$inferInsert;

/**
 * 考試成績表格
 */
export const examScores = mysqlTable("examScores", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull().unique(), // 關聯到examAssignments
  totalScore: int("totalScore").notNull(), // 總得分
  maxScore: int("maxScore").notNull(), // 滿分
  percentage: int("percentage").notNull(), // 百分比分數
  passed: int("passed").notNull(), // 是否及格（1=及格，0=不及格）
  gradedBy: int("gradedBy"), // 評分人ID（人工評分時使用）
  gradedAt: timestamp("gradedAt"), // 評分時間
  feedback: text("feedback"), // 評分人的整體評語
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExamScore = typeof examScores.$inferSelect;
export type InsertExamScore = typeof examScores.$inferInsert;

