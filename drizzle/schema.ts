import { integer, pgEnum, pgTable, text, timestamp, varchar, serial } from "drizzle-orm/pg-core";

// Define enums
export const roleEnum = pgEnum("role", ["admin", "editor", "viewer", "examinee"]);
export const questionTypeEnum = pgEnum("question_type", ["true_false", "multiple_choice", "multiple_answer", "short_answer"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const examStatusEnum = pgEnum("exam_status", ["draft", "published", "archived"]);
export const gradingMethodEnum = pgEnum("grading_method", ["auto", "manual", "mixed"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "in_progress", "submitted", "graded"]);
export const notificationTypeEnum = pgEnum("notification_type", ["exam_reminder", "makeup_exam", "learning_recommendation", "system"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("examinee").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 部門表格
 */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * 人員表格
 */
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  departmentId: integer("departmentId").notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * 檔案表格
 */
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId"),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadDate: timestamp("uploadDate").notNull(),
  extractedText: text("extractedText"),
  uploadedBy: integer("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * AI分析結果表格
 */
export const analysisResults = pgTable("analysisResults", {
  id: serial("id").primaryKey(),
  fileId: integer("fileId").notNull(),
  analysisType: varchar("analysisType", { length: 50 }).notNull(),
  result: text("result").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = typeof analysisResults.$inferInsert;

/**
 * 檔案閱讀記錄表格
 */
export const fileReadLogs = pgTable("fileReadLogs", {
  id: serial("id").primaryKey(),
  fileId: integer("fileId").notNull(),
  userId: integer("userId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
});

export type FileReadLog = typeof fileReadLogs.$inferSelect;
export type InsertFileReadLog = typeof fileReadLogs.$inferInsert;

/**
 * 題目分類表格（支援多層級樹狀結構）
 */
export const questionCategories = pgTable("questionCategories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: integer("parentId"), // 父分類 ID，null 表示根分類
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type QuestionCategory = typeof questionCategories.$inferSelect;
export type InsertQuestionCategory = typeof questionCategories.$inferInsert;

/**
 * 標籤表格
 */
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(), // 標籤分類（例如：難度、職位、業界分類等）
  description: text("description"), // 標籤說明
  color: varchar("color", { length: 20 }), // 標籤顏色（例如：#3b82f6）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * 題目-標籤關聯表（多對多）
 */
export const questionTags = pgTable("questionTags", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(),
  tagId: integer("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionTag = typeof questionTags.$inferSelect;
export type InsertQuestionTag = typeof questionTags.$inferInsert;

/**
 * 題庫表格
 */
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId"),
  type: questionTypeEnum("type").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  question: text("question").notNull(),
  options: text("options"), // JSON格式儲存選項（僅選擇題使用）
  correctAnswer: text("correctAnswer").notNull(),
  explanation: text("explanation"),
  // tags 欄位已移除，改用 questionTags 關聯
  source: varchar("source", { length: 255 }), // 考題出處（檔案名稱或手動輸入）
  isAiGenerated: integer("isAiGenerated").default(0).notNull(), // 是否為AI生成（0=手動建立, 1=AI生成）
  suggestedCategoryId: integer("suggestedCategoryId"), // AI建議的分類（供使用者參考）
  suggestedTagIds: text("suggestedTagIds"), // AI建議的標籤ID（JSON陣列格式，供使用者參考）
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 軟刪除時間（null 表示未刪除）
  deletedBy: integer("deletedBy"), // 刪除者 ID
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

/**
 * 題庫檔案表格（用於組織和管理題目集合）
 */
export const questionBanks = pgTable("questionBanks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // 題庫檔案名稱
  description: text("description"), // 描述
  tags: text("tags"), // JSON格式儲存標籤陣列
  source: varchar("source", { length: 255 }), // 來源（匯入檔案名或手動建立）
  questionCount: integer("questionCount").default(0).notNull(), // 題目數量
  createdBy: integer("createdBy").notNull(), // 建立者用戶ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type QuestionBank = typeof questionBanks.$inferSelect;
export type InsertQuestionBank = typeof questionBanks.$inferInsert;

/**
 * 題庫檔案-題目關聯表（多對多）
 */
export const questionBankItems = pgTable("questionBankItems", {
  id: serial("id").primaryKey(),
  bankId: integer("bankId").notNull(), // 題庫檔案ID
  questionId: integer("questionId").notNull(), // 題目ID
  order: integer("order").default(0).notNull(), // 題目順序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionBankItem = typeof questionBankItems.$inferSelect;
export type InsertQuestionBankItem = typeof questionBankItems.$inferInsert;

/**
 * AI分析歷史記錄表格（記錄每次AI分析的結果）
 */
export const analysisHistory = pgTable("analysisHistory", {
  id: serial("id").primaryKey(),
  analysisType: varchar("analysisType", { length: 50 }).notNull(), // 分析類型（generate_questions, analyze_questions, other）
  analysisMode: varchar("analysisMode", { length: 50 }).notNull(), // 分析模式（file_only, external_info, comprehensive）
  prompt: text("prompt"), // 使用者提示詞
  fileIds: text("fileIds").notNull(), // 相關檔案ID（JSON陣列）
  fileNames: text("fileNames"), // 檔案名稱列表（JSON陣列，方便顯示）
  result: text("result").notNull(), // 分析結果（JSON格式）
  resultHash: varchar("resultHash", { length: 32 }), // MD5雜湊（用於快取）
  qualityScore: integer("qualityScore"), // 品質評分（1=好，-1=壞，null=未評分）
  userFeedback: text("userFeedback"), // 使用者反饋文字
  createdBy: integer("createdBy").notNull(), // 執行分析的使用者ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisHistory = typeof analysisHistory.$inferSelect;
export type InsertAnalysisHistory = typeof analysisHistory.$inferInsert;

/**
 * 考核記錄表格（保留給考試系統使用）
 */
export const assessmentRecords = pgTable("assessmentRecords", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(), // 受考人員ID
  analysisType: varchar("analysisType", { length: 50 }).notNull(), // 分析類型（generate_questions, analyze_questions, other）
  score: integer("score"), // 分數（如果有）
  result: text("result").notNull(), // 分析結果（JSON格式）
  fileIds: text("fileIds"), // 相關檔案ID（JSON陣列）
  createdBy: integer("createdBy").notNull(), // 執行分析的使用者ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssessmentRecord = typeof assessmentRecords.$inferSelect;
export type InsertAssessmentRecord = typeof assessmentRecords.$inferInsert;

/**
 * 考試表格
 */
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  timeLimit: integer("timeLimit"), // 時間限制（分鐘），null表示不限時
  passingScore: integer("passingScore").notNull(), // 及格分數
  totalScore: integer("totalScore").notNull(), // 總分
  gradingMethod: gradingMethodEnum("gradingMethod").notNull().default("auto"), // 評分方式：自動、人工、混合
  status: examStatusEnum("status").notNull().default("draft"), // 考試狀態
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

/**
 * 考試題目關聯表格
 */
export const examQuestions = pgTable("examQuestions", {
  id: serial("id").primaryKey(),
  examId: integer("examId").notNull(),
  questionId: integer("questionId").notNull(),
  questionOrder: integer("questionOrder").notNull(), // 題目順序
  points: integer("points").notNull(), // 該題分數
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamQuestion = typeof examQuestions.$inferSelect;
export type InsertExamQuestion = typeof examQuestions.$inferInsert;

/**
 * 考卷範本表格
 */
export const examTemplates = pgTable("examTemplates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  timeLimit: integer("timeLimit"), // 時間限制（分鐘）
  passingScore: integer("passingScore").notNull(), // 及格分數
  gradingMethod: gradingMethodEnum("gradingMethod").notNull().default("auto"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExamTemplate = typeof examTemplates.$inferSelect;
export type InsertExamTemplate = typeof examTemplates.$inferInsert;

/**
 * 範本題目關聯表格
 */
export const examTemplateQuestions = pgTable("examTemplateQuestions", {
  id: serial("id").primaryKey(),
  templateId: integer("templateId").notNull(),
  questionId: integer("questionId").notNull(),
  questionOrder: integer("questionOrder").notNull(), // 題目順序
  points: integer("points").notNull(), // 該題分數
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamTemplateQuestion = typeof examTemplateQuestions.$inferSelect;
export type InsertExamTemplateQuestion = typeof examTemplateQuestions.$inferInsert;

/**
 * 考試指派表格
 */
export const examAssignments = pgTable("examAssignments", {
  id: serial("id").primaryKey(),
  examId: integer("examId").notNull(),
  userId: integer("userId").notNull(), // 考生的user ID
  employeeId: integer("employeeId"), // 考生的employee ID（如果有）
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  startTime: timestamp("startTime"), // 考試開始時間（null表示未開始）
  endTime: timestamp("endTime"), // 考試結束時間（null表示未結束）
  deadline: timestamp("deadline"), // 截止時間（null表示不限期）
  status: assignmentStatusEnum("status").notNull().default("pending"),
  isPractice: integer("isPractice").notNull().default(0), // 是否為模擬模式（1=模擬，0=正式）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExamAssignment = typeof examAssignments.$inferSelect;
export type InsertExamAssignment = typeof examAssignments.$inferInsert;

/**
 * 考試作答記錄表格
 */
export const examSubmissions = pgTable("examSubmissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull(), // 關聯到examAssignments
  questionId: integer("questionId").notNull(),
  answer: text("answer").notNull(), // 考生的答案
  isCorrect: integer("isCorrect"), // 是否正確（1=正確，0=錯誤，null=待評分）
  score: integer("score"), // 該題得分（null表示未評分）
  aiEvaluation: text("aiEvaluation"), // AI評分結果（JSON格式，包含評分理由）
  teacherComment: text("teacherComment"), // 教師評語（人工評分時使用）
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExamSubmission = typeof examSubmissions.$inferSelect;
export type InsertExamSubmission = typeof examSubmissions.$inferInsert;

/**
 * 錯題本表格（自動收集考生答錯的題目）
 */
export const wrongQuestions = pgTable("wrongQuestions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // 考生 ID
  questionId: integer("questionId").notNull(), // 題目 ID
  wrongCount: integer("wrongCount").notNull().default(1), // 答錯次數
  lastWrongAt: timestamp("lastWrongAt").defaultNow().notNull(), // 最後一次答錯時間
  isReviewed: integer("isReviewed").notNull().default(0), // 是否已複習（1=已複習，0=未複習）
  reviewedAt: timestamp("reviewedAt"), // 複習時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WrongQuestion = typeof wrongQuestions.$inferSelect;
export type InsertWrongQuestion = typeof wrongQuestions.$inferInsert;

/**
 * 考試成績表格
 */
export const examScores = pgTable("examScores", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull().unique(), // 關聯到examAssignments
  totalScore: integer("totalScore").notNull(), // 總得分
  maxScore: integer("maxScore").notNull(), // 滿分
  percentage: integer("percentage").notNull(), // 百分比分數
  passed: integer("passed").notNull(), // 是否及格（1=及格，0=不及格）
  gradedBy: integer("gradedBy"), // 評分人ID（人工評分時使用）
  gradedAt: timestamp("gradedAt"), // 評分時間
  feedback: text("feedback"), // 評分人的整體評語
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExamScore = typeof examScores.$inferSelect;
export type InsertExamScore = typeof examScores.$inferInsert;


/**
 * 編輯者-部門訪問權限表格
 * 用於控制編輯者可以訪問哪些部門的考生資料
 */
export const editorDepartmentAccess = pgTable("editorDepartmentAccess", {
  id: serial("id").primaryKey(),
  editorId: integer("editorId").notNull(), // 編輯者的使用者ID
  departmentId: integer("departmentId").notNull(), // 可訪問的部門ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: integer("createdBy").notNull(), // 設定權限的管理員ID
});

export type EditorDepartmentAccess = typeof editorDepartmentAccess.$inferSelect;
export type InsertEditorDepartmentAccess = typeof editorDepartmentAccess.$inferInsert;

/**
 * 編輯者-考生訪問權限表格
 * 用於控制編輯者可以訪問哪些特定考生的資料
 */
export const editorUserAccess = pgTable("editorUserAccess", {
  id: serial("id").primaryKey(),
  editorId: integer("editorId").notNull(), // 編輯者的使用者ID
  userId: integer("userId").notNull(), // 可訪問的考生ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: integer("createdBy").notNull(), // 設定權限的管理員ID
});

export type EditorUserAccess = typeof editorUserAccess.$inferSelect;
export type InsertEditorUserAccess = typeof editorUserAccess.$inferInsert;



/**
 * 考試提醒記錄表格
 * 用於追蹤已發送的提醒，避免重複提醒
 */
export const examReminders = pgTable("examReminders", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull(), // 關聯到examAssignments
  reminderType: pgEnum("reminderType", ["3days", "1day", "today"]).notNull(), // 提醒類型
  sentAt: timestamp("sentAt").defaultNow().notNull(), // 發送時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamReminder = typeof examReminders.$inferSelect;
export type InsertExamReminder = typeof examReminders.$inferInsert;

/**
 * 補考記錄表格
 * 記錄不及格考生的補考安排和結果
 */
export const makeupExams = pgTable("makeupExams", {
  id: serial("id").primaryKey(),
  originalAssignmentId: integer("originalAssignmentId").notNull(), // 原始考試指派ID
  makeupAssignmentId: integer("makeupAssignmentId"), // 補考的考試指派ID（建立補考後填入）
  userId: integer("userId").notNull(), // 考生ID
  examId: integer("examId").notNull(), // 考試ID
  makeupCount: integer("makeupCount").notNull().default(1), // 第幾次補考（1=第一次補考）
  maxMakeupAttempts: integer("maxMakeupAttempts").notNull().default(2), // 最多可補考次數
  makeupDeadline: timestamp("makeupDeadline"), // 補考截止日期
  status: pgEnum("status", ["pending", "scheduled", "completed", "expired"]).notNull().default("pending"), // 補考狀態
  originalScore: integer("originalScore"), // 原始考試分數
  makeupScore: integer("makeupScore"), // 補考分數
  reason: text("reason"), // 補考原因（自動填入：不及格）
  notes: text("notes"), // 管理員備註
  scheduledBy: integer("scheduledBy"), // 安排補考的管理員ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MakeupExam = typeof makeupExams.$inferSelect;
export type InsertMakeupExam = typeof makeupExams.$inferInsert;

/**
 * 學習建議表格
 * 根據錯題分析為考生提供學習建議
 */
export const learningRecommendations = pgTable("learningRecommendations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // 考生ID
  assignmentId: integer("assignmentId"), // 關聯的考試指派ID（可選）
  makeupExamId: integer("makeupExamId"), // 關聯的補考記錄ID（可選）
  recommendationType: pgEnum("recommendationType", ["weak_topics", "practice_questions", "study_materials", "ai_generated"]).notNull(), // 建議類型
  title: varchar("title", { length: 200 }).notNull(), // 建議標題
  content: text("content").notNull(), // 建議內容（JSON格式，包含詳細建議）
  relatedQuestionIds: text("relatedQuestionIds"), // 相關題目ID（JSON陣列）
  relatedCategoryIds: text("relatedCategoryIds"), // 相關分類ID（JSON陣列）
  relatedTagIds: text("relatedTagIds"), // 相關標籤ID（JSON陣列）
  priority: pgEnum("priority", ["high", "medium", "low"]).notNull().default("medium"), // 優先級
  isRead: integer("isRead").notNull().default(0), // 是否已讀（1=已讀，0=未讀）
  readAt: timestamp("readAt"), // 閱讀時間
  generatedBy: varchar("generatedBy", { length: 50 }).notNull().default("system"), // 生成來源（system=系統自動, ai=AI生成, manual=人工建立）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LearningRecommendation = typeof learningRecommendations.$inferSelect;
export type InsertLearningRecommendation = typeof learningRecommendations.$inferInsert;

/**
 * 通知記錄表格
 * 記錄系統發送的所有通知（不及格通知、補考提醒等）
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // 接收通知的使用者ID（0表示通知管理員）
  notificationType: pgEnum("notificationType", ["exam_failed", "makeup_scheduled", "makeup_reminder", "makeup_deadline", "other"]).notNull(), // 通知類型
  title: varchar("title", { length: 200 }).notNull(), // 通知標題
  content: text("content").notNull(), // 通知內容
  relatedExamId: integer("relatedExamId"), // 相關考試ID
  relatedAssignmentId: integer("relatedAssignmentId"), // 相關考試指派ID
  relatedMakeupExamId: integer("relatedMakeupExamId"), // 相關補考記錄ID
  isRead: integer("isRead").notNull().default(0), // 是否已讀（1=已讀，0=未讀）
  readAt: timestamp("readAt"), // 閱讀時間
  sentAt: timestamp("sentAt").defaultNow().notNull(), // 發送時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

