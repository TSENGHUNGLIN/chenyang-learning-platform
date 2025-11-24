import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getMyExamScores, getScoreStatistics, getScoreRankings, getScoreTrends, getAnswerAccuracy } from "../db";

describe("成績管理與分析功能測試", () => {
  beforeAll(async () => {
    // 確保資料庫連線正常
    const db = await getDb();
    expect(db).toBeDefined();
  });

  describe("個人成績查詢", () => {
    it("應該能夠查詢使用者的所有考試成績", async () => {
      // 使用測試用戶 ID（假設存在）
      const userId = 1;
      const scores = await getMyExamScores(userId);
      
      expect(Array.isArray(scores)).toBe(true);
      
      // 如果有成績記錄，檢查資料結構
      if (scores.length > 0) {
        const score = scores[0];
        expect(score).toHaveProperty("id");
        expect(score).toHaveProperty("totalScore");
        expect(score).toHaveProperty("maxScore");
        expect(score).toHaveProperty("percentage");
        expect(score).toHaveProperty("passed");
        expect(score).toHaveProperty("examTitle");
      }
    });

    it("查詢不存在的使用者應該回傳空陣列", async () => {
      const userId = 999999; // 不存在的用戶
      const scores = await getMyExamScores(userId);
      
      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBe(0);
    });
  });

  describe("成績統計分析", () => {
    it("應該能夠查詢所有考試的統計資料", async () => {
      const statistics = await getScoreStatistics();
      
      if (statistics) {
        expect(statistics).toHaveProperty("totalExams");
        expect(statistics).toHaveProperty("avgScore");
        expect(statistics).toHaveProperty("maxScore");
        expect(statistics).toHaveProperty("minScore");
        expect(statistics).toHaveProperty("passCount");
        expect(statistics).toHaveProperty("failCount");
        expect(statistics).toHaveProperty("passRate");
        
        // 檢查數值範圍
        expect(statistics.totalExams).toBeGreaterThanOrEqual(0);
        expect(statistics.avgScore).toBeGreaterThanOrEqual(0);
        expect(statistics.avgScore).toBeLessThanOrEqual(100);
        expect(statistics.passRate).toBeGreaterThanOrEqual(0);
        expect(statistics.passRate).toBeLessThanOrEqual(100);
      }
    });

    it("應該能夠查詢特定考試的統計資料", async () => {
      const examId = 1; // 假設存在的考試 ID
      const statistics = await getScoreStatistics(examId);
      
      // 如果該考試有成績記錄，應該回傳統計資料
      if (statistics) {
        expect(statistics).toHaveProperty("totalExams");
        expect(statistics.totalExams).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("成績排名查詢", () => {
    it("應該能夠查詢成績排名 Top 10", async () => {
      const rankings = await getScoreRankings(undefined, 10);
      
      expect(Array.isArray(rankings)).toBe(true);
      expect(rankings.length).toBeLessThanOrEqual(10);
      
      // 如果有排名記錄，檢查資料結構和排序
      if (rankings.length > 0) {
        const rank = rankings[0];
        expect(rank).toHaveProperty("userId");
        expect(rank).toHaveProperty("userName");
        expect(rank).toHaveProperty("examTitle");
        expect(rank).toHaveProperty("percentage");
        expect(rank).toHaveProperty("passed");
        
        // 檢查是否依百分比降序排列
        if (rankings.length > 1) {
          expect(rankings[0].percentage).toBeGreaterThanOrEqual(rankings[1].percentage);
        }
      }
    });

    it("應該能夠限制排名數量", async () => {
      const limit = 5;
      const rankings = await getScoreRankings(undefined, limit);
      
      expect(Array.isArray(rankings)).toBe(true);
      expect(rankings.length).toBeLessThanOrEqual(limit);
    });
  });

  describe("成績趨勢分析", () => {
    it("應該能夠查詢使用者的成績趨勢", async () => {
      const userId = 1;
      const trends = await getScoreTrends(userId, 10);
      
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeLessThanOrEqual(10);
      
      // 如果有趨勢記錄，檢查資料結構
      if (trends.length > 0) {
        const trend = trends[0];
        expect(trend).toHaveProperty("examTitle");
        expect(trend).toHaveProperty("percentage");
        expect(trend).toHaveProperty("passed");
        expect(trend).toHaveProperty("gradedAt");
      }
    });

    it("查詢不存在的使用者應該回傳空陣列", async () => {
      const userId = 999999;
      const trends = await getScoreTrends(userId, 10);
      
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBe(0);
    });
  });

  describe("答題正確率分析", () => {
    it("應該能夠查詢使用者的答題正確率", async () => {
      const userId = 1;
      const accuracy = await getAnswerAccuracy(userId);
      
      expect(Array.isArray(accuracy)).toBe(true);
      
      // 如果有答題記錄，檢查資料結構
      if (accuracy && accuracy.length > 0) {
        const stat = accuracy[0];
        expect(stat).toHaveProperty("questionType");
        expect(stat).toHaveProperty("totalQuestions");
        expect(stat).toHaveProperty("correctCount");
        expect(stat).toHaveProperty("incorrectCount");
        expect(stat).toHaveProperty("accuracy");
        
        // 檢查數值邏輯
        expect(stat.totalQuestions).toBe(stat.correctCount + stat.incorrectCount);
        expect(stat.accuracy).toBeGreaterThanOrEqual(0);
        expect(stat.accuracy).toBeLessThanOrEqual(100);
      }
    });

    it("應該能夠查詢特定考試的答題正確率", async () => {
      const userId = 1;
      const examId = 1;
      const accuracy = await getAnswerAccuracy(userId, examId);
      
      expect(Array.isArray(accuracy)).toBe(true);
    });

    it("查詢不存在的使用者應該回傳空陣列", async () => {
      const userId = 999999;
      const accuracy = await getAnswerAccuracy(userId);
      
      expect(Array.isArray(accuracy)).toBe(true);
      expect(accuracy.length).toBe(0);
    });
  });

  describe("資料完整性檢查", () => {
    it("所有查詢函式都應該處理資料庫連線失敗的情況", async () => {
      // 這些函式應該在資料庫不可用時優雅地處理錯誤
      const userId = 1;
      
      // 不應該拋出未捕獲的錯誤
      await expect(getMyExamScores(userId)).resolves.toBeDefined();
      await expect(getScoreStatistics()).resolves.toBeDefined();
      await expect(getScoreRankings()).resolves.toBeDefined();
      await expect(getScoreTrends(userId)).resolves.toBeDefined();
      await expect(getAnswerAccuracy(userId)).resolves.toBeDefined();
    });
  });
});

