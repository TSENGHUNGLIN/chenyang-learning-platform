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
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(), // 標籤分類（例如：難度、職位、業界分類等）
  description: text("description"), // 標籤說明
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
  // tags 欄位已移除，改用 questionTags 關聯
  source: varchar("source", { length: 255 }), // 考題出處（檔案名稱或手動輸入）
  isAiGenerated: int("isAiGenerated").default(0).notNull(), // 是否為AI生成（0=手動建立, 1=AI生成）
  suggestedCategoryId: int("suggestedCategoryId"), // AI建議的分類（供使用者參考）
  suggestedTagIds: text("suggestedTagIds"), // AI建議的標籤ID（JSON陣列格式，供使用者參考）
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 軟刪除時間（null 表示未刪除）
  deletedBy: int("deletedBy"), // 刪除者 ID
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
  resultHash: varchar("resultHash", { length: 32 }), // MD5雜湊（用於快取）
  qualityScore: int("qualityScore"), // 品質評分（1=好，-1=壞，null=未評分）
  userFeedback: text("userFeedback"), // 使用者反饋文字
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
 * 考卷範本表格
 */
export const examTemplates = mysqlTable("examTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  timeLimit: int("timeLimit"), // 時間限制（分鐘）
  passingScore: int("passingScore").notNull(), // 及格分數
  gradingMethod: mysqlEnum("gradingMethod", ["auto", "manual", "mixed"]).notNull().default("auto"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExamTemplate = typeof examTemplates.$inferSelect;
export type InsertExamTemplate = typeof examTemplates.$inferInsert;

/**
 * 範本題目關聯表格
 */
export const examTemplateQuestions = mysqlTable("examTemplateQuestions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  questionId: int("questionId").notNull(),
  questionOrder: int("questionOrder").notNull(), // 題目順序
  points: int("points").notNull(), // 該題分數
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamTemplateQuestion = typeof examTemplateQuestions.$inferSelect;
export type InsertExamTemplateQuestion = typeof examTemplateQuestions.$inferInsert;

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
  isPractice: int("isPractice").notNull().default(0), // 是否為模擬模式（1=模擬，0=正式）
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
 * 錯題本表格（自動收集考生答錯的題目）
 */
export const wrongQuestions = mysqlTable("wrongQuestions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 考生 ID
  questionId: int("questionId").notNull(), // 題目 ID
  wrongCount: int("wrongCount").notNull().default(1), // 答錯次數
  lastWrongAt: timestamp("lastWrongAt").defaultNow().notNull(), // 最後一次答錯時間
  isReviewed: int("isReviewed").notNull().default(0), // 是否已複習（1=已複習，0=未複習）
  reviewedAt: timestamp("reviewedAt"), // 複習時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WrongQuestion = typeof wrongQuestions.$inferSelect;
export type InsertWrongQuestion = typeof wrongQuestions.$inferInsert;

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


/**
 * 編輯者-部門訪問權限表格
 * 用於控制編輯者可以訪問哪些部門的考生資料
 */
export const editorDepartmentAccess = mysqlTable("editorDepartmentAccess", {
  id: int("id").autoincrement().primaryKey(),
  editorId: int("editorId").notNull(), // 編輯者的使用者ID
  departmentId: int("departmentId").notNull(), // 可訪問的部門ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(), // 設定權限的管理員ID
});

export type EditorDepartmentAccess = typeof editorDepartmentAccess.$inferSelect;
export type InsertEditorDepartmentAccess = typeof editorDepartmentAccess.$inferInsert;

/**
 * 編輯者-考生訪問權限表格
 * 用於控制編輯者可以訪問哪些特定考生的資料
 */
export const editorUserAccess = mysqlTable("editorUserAccess", {
  id: int("id").autoincrement().primaryKey(),
  editorId: int("editorId").notNull(), // 編輯者的使用者ID
  userId: int("userId").notNull(), // 可訪問的考生ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(), // 設定權限的管理員ID
});

export type EditorUserAccess = typeof editorUserAccess.$inferSelect;
export type InsertEditorUserAccess = typeof editorUserAccess.$inferInsert;



/**
 * 考試提醒記錄表格
 * 用於追蹤已發送的提醒，避免重複提醒
 */
export const examReminders = mysqlTable("examReminders", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(), // 關聯到examAssignments
  reminderType: mysqlEnum("reminderType", ["3days", "1day", "today"]).notNull(), // 提醒類型
  sentAt: timestamp("sentAt").defaultNow().notNull(), // 發送時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamReminder = typeof examReminders.$inferSelect;
export type InsertExamReminder = typeof examReminders.$inferInsert;

/**
 * 補考記錄表格
 * 記錄不及格考生的補考安排和結果
 */
export const makeupExams = mysqlTable("makeupExams", {
  id: int("id").autoincrement().primaryKey(),
  originalAssignmentId: int("originalAssignmentId").notNull(), // 原始考試指派ID
  makeupAssignmentId: int("makeupAssignmentId"), // 補考的考試指派ID（建立補考後填入）
  userId: int("userId").notNull(), // 考生ID
  examId: int("examId").notNull(), // 考試ID
  makeupCount: int("makeupCount").notNull().default(1), // 第幾次補考（1=第一次補考）
  maxMakeupAttempts: int("maxMakeupAttempts").notNull().default(2), // 最多可補考次數
  makeupDeadline: timestamp("makeupDeadline"), // 補考截止日期
  status: mysqlEnum("status", ["pending", "scheduled", "completed", "expired"]).notNull().default("pending"), // 補考狀態
  originalScore: int("originalScore"), // 原始考試分數
  makeupScore: int("makeupScore"), // 補考分數
  reason: text("reason"), // 補考原因（自動填入：不及格）
  notes: text("notes"), // 管理員備註
  scheduledBy: int("scheduledBy"), // 安排補考的管理員ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MakeupExam = typeof makeupExams.$inferSelect;
export type InsertMakeupExam = typeof makeupExams.$inferInsert;

/**
 * 學習建議表格
 * 根據錯題分析為考生提供學習建議
 */
export const learningRecommendations = mysqlTable("learningRecommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 考生ID
  assignmentId: int("assignmentId"), // 關聯的考試指派ID（可選）
  makeupExamId: int("makeupExamId"), // 關聯的補考記錄ID（可選）
  recommendationType: mysqlEnum("recommendationType", ["weak_topics", "practice_questions", "study_materials", "ai_generated"]).notNull(), // 建議類型
  title: varchar("title", { length: 200 }).notNull(), // 建議標題
  content: text("content").notNull(), // 建議內容（JSON格式，包含詳細建議）
  relatedQuestionIds: text("relatedQuestionIds"), // 相關題目ID（JSON陣列）
  relatedCategoryIds: text("relatedCategoryIds"), // 相關分類ID（JSON陣列）
  relatedTagIds: text("relatedTagIds"), // 相關標籤ID（JSON陣列）
  priority: mysqlEnum("priority", ["high", "medium", "low"]).notNull().default("medium"), // 優先級
  isRead: int("isRead").notNull().default(0), // 是否已讀（1=已讀，0=未讀）
  readAt: timestamp("readAt"), // 閱讀時間
  generatedBy: varchar("generatedBy", { length: 50 }).notNull().default("system"), // 生成來源（system=系統自動, ai=AI生成, manual=人工建立）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningRecommendation = typeof learningRecommendations.$inferSelect;
export type InsertLearningRecommendation = typeof learningRecommendations.$inferInsert;

/**
 * 通知記錄表格
 * 記錄系統發送的所有通知（不及格通知、補考提醒等）
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 接收通知的使用者ID（0表示通知管理員）
  notificationType: mysqlEnum("notificationType", ["exam_failed", "makeup_scheduled", "makeup_reminder", "makeup_deadline", "other"]).notNull(), // 通知類型
  title: varchar("title", { length: 200 }).notNull(), // 通知標題
  content: text("content").notNull(), // 通知內容
  relatedExamId: int("relatedExamId"), // 相關考試ID
  relatedAssignmentId: int("relatedAssignmentId"), // 相關考試指派ID
  relatedMakeupExamId: int("relatedMakeupExamId"), // 相關補考記錄ID
  isRead: int("isRead").notNull().default(0), // 是否已讀（1=已讀，0=未讀）
  readAt: timestamp("readAt"), // 閱讀時間
  sentAt: timestamp("sentAt").defaultNow().notNull(), // 發送時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * 考試規劃批次記錄表格
 * 記錄每次批次規劃的操作，方便追蹤和管理
 */
export const examPlanningBatches = mysqlTable("examPlanningBatches", {
  id: int("id").autoincrement().primaryKey(),
  batchName: varchar("batchName", { length: 200 }), // 批次名稱（可選）
  description: text("description"), // 批次說明
  totalAssignments: int("totalAssignments").notNull().default(0), // 本批次建立的指派總數
  examIds: text("examIds").notNull(), // 考試ID列表（JSON陣列）
  userIds: text("userIds").notNull(), // 考生ID列表（JSON陣列）
  importSource: mysqlEnum("importSource", ["manual", "csv", "excel"]).notNull().default("manual"), // 來源：手動、CSV、Excel
  importFileName: varchar("importFileName", { length: 500 }), // 匯入檔案名稱（如果是批次匯入）
  createdBy: int("createdBy").notNull(), // 建立者ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamPlanningBatch = typeof examPlanningBatches.$inferSelect;
export type InsertExamPlanningBatch = typeof examPlanningBatches.$inferInsert;

/**
 * 逾期考試處理記錄表格
 * 記錄逾期考試的處理動作（提醒、標記、補考安排等）
 */
export const overdueExamActions = mysqlTable("overdueExamActions", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(), // 關聯的考試指派ID
  examId: int("examId").notNull(), // 考試ID
  userId: int("userId").notNull(), // 考生ID
  actionType: mysqlEnum("actionType", ["reminder_sent", "marked_overdue", "makeup_scheduled", "deadline_extended"]).notNull(), // 處理動作類型
  actionDetails: text("actionDetails"), // 動作詳情（JSON格式）
  overdueBy: int("overdueBy"), // 逾期天數
  originalDeadline: timestamp("originalDeadline"), // 原始截止時間
  newDeadline: timestamp("newDeadline"), // 新截止時間（如果延期）
  performedBy: int("performedBy"), // 執行動作的管理員ID（null表示系統自動）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OverdueExamAction = typeof overdueExamActions.$inferSelect;
export type InsertOverdueExamAction = typeof overdueExamActions.$inferInsert;

