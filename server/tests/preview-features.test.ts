import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";

describe("預視功能測試", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;
  let testQuestionId: number;
  let testExamId: number;
  let testTemplateId: number;

  beforeAll(async () => {
    // 建立測試用的 caller（模擬管理員權限）
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-admin",
        name: "測試管理員",
        email: "admin@test.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        loginMethod: "test",
      },
      req: {} as any,
      res: {} as any,
    });

    // 建立測試題目
    testQuestionId = await caller.questions.create({
      question: "測試題目：什麼是 TypeScript？",
      type: "multiple_choice",
      options: JSON.stringify(["一種程式語言", "一種資料庫", "一種作業系統", "一種瀏覽器"]),
      correctAnswer: "0",
      explanation: "TypeScript 是 JavaScript 的超集，提供靜態型別檢查。",
      difficulty: "easy",
      score: 10,
      source: "測試",
    });

    // 建立測試考試
    testExamId = await caller.exams.create({
      title: "測試考試",
      description: "這是一個測試考試",
      timeLimit: 60,
      passingScore: 60,
      status: "published",
    });

    // 將題目加入考試
    await caller.exams.addQuestion({
      examId: testExamId,
      questionId: testQuestionId,
      score: 10,
    });

    // 建立測試範本
    testTemplateId = await caller.examTemplates.create({
      name: "測試範本",
      description: "這是一個測試範本",
      timeLimit: 60,
      passingScore: 60,
      questionIds: [testQuestionId],
      questionPoints: [10],
    });
  });

  describe("題目預覽功能", () => {
    it("應該能夠查詢題目詳細資訊", async () => {
      const question = await caller.questions.getById(testQuestionId);
      
      expect(question).toBeDefined();
      expect(question.id).toBe(testQuestionId);
      expect(question.question).toContain("TypeScript");
      expect(question.type).toBe("multiple_choice");
      expect(question.options).toBeDefined();
      expect(question.correctAnswer).toBeDefined();
      expect(question.explanation).toBeDefined();
    });

    it("題目選項應該是有效的 JSON 格式", async () => {
      const question = await caller.questions.getById(testQuestionId);
      
      expect(() => JSON.parse(question.options || "[]")).not.toThrow();
      const options = JSON.parse(question.options || "[]");
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe("考試預覽功能", () => {
    it("應該能夠查詢考試詳細資訊", async () => {
      const exam = await caller.exams.getById(testExamId);
      
      expect(exam).toBeDefined();
      expect(exam.id).toBe(testExamId);
      expect(exam.title).toBe("測試考試");
      expect(exam.timeLimit).toBe(60);
      expect(exam.passingScore).toBe(60);
    });

    it("考試應該包含題目列表", async () => {
      const exam = await caller.exams.getById(testExamId);
      
      expect(exam.questions).toBeDefined();
      expect(Array.isArray(exam.questions)).toBe(true);
      expect(exam.questions.length).toBeGreaterThan(0);
    });

    it("考試題目應該包含完整資訊", async () => {
      const exam = await caller.exams.getById(testExamId);
      const firstQuestion = exam.questions[0];
      
      expect(firstQuestion).toBeDefined();
      expect(firstQuestion.content).toBeDefined();
      expect(firstQuestion.type).toBeDefined();
      expect(firstQuestion.score).toBeDefined();
      expect(firstQuestion.difficulty).toBeDefined();
    });
  });

  describe("考卷範本預覽功能", () => {
    it("應該能夠查詢範本詳細資訊", async () => {
      const template = await caller.examTemplates.getById(testTemplateId);
      
      expect(template).toBeDefined();
      expect(template.id).toBe(testTemplateId);
      expect(template.name).toBe("測試範本");
      expect(template.timeLimit).toBe(60);
      expect(template.passingScore).toBe(60);
    });

    it("範本應該包含題目列表", async () => {
      const template = await caller.examTemplates.getById(testTemplateId);
      
      expect(template.questions).toBeDefined();
      expect(Array.isArray(template.questions)).toBe(true);
      expect(template.questions.length).toBeGreaterThan(0);
    });

    it("範本題目應該包含完整資訊", async () => {
      const template = await caller.examTemplates.getById(testTemplateId);
      const firstQuestion = template.questions[0];
      
      expect(firstQuestion).toBeDefined();
      expect(firstQuestion.content).toBeDefined();
      expect(firstQuestion.type).toBeDefined();
      expect(firstQuestion.score).toBeDefined();
      expect(firstQuestion.difficulty).toBeDefined();
    });
  });

  describe("資料完整性檢查", () => {
    it("題目的題型應該是有效值", async () => {
      const question = await caller.questions.getById(testQuestionId);
      const validTypes = ["true-false", "single-choice", "multiple-choice", "short-answer"];
      
      expect(validTypes).toContain(question.type);
    });

    it("題目的難度應該是有效值", async () => {
      const question = await caller.questions.getById(testQuestionId);
      const validDifficulties = ["easy", "medium", "hard"];
      
      expect(validDifficulties).toContain(question.difficulty);
    });

    it("考試狀態應該是有效值", async () => {
      const exam = await caller.exams.getById(testExamId);
      const validStatuses = ["draft", "published", "archived"];
      
      expect(validStatuses).toContain(exam.status);
    });
  });
});

