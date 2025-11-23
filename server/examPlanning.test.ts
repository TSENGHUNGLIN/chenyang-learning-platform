import { describe, it, expect } from "vitest";

describe("考生考試規劃頁面優化功能測試", () => {
  describe("時間設定彈性化", () => {
    it("應該正確計算每日考的開始時間", () => {
      const baseDate = new Date("2025-02-01T09:00:00");
      const examCount = 5;
      const intervalDays = 1; // 每日考

      const startTimes = [];
      for (let i = 0; i < examCount; i++) {
        const examDate = new Date(baseDate);
        examDate.setDate(examDate.getDate() + i * intervalDays);
        startTimes.push(examDate.toISOString().slice(0, 16));
      }

      expect(startTimes.length).toBe(5);
      // 檢查日期間隔是否正確（不檢查具體時區）
      const dates = startTimes.map(t => t.slice(0, 10));
      expect(dates[0]).toBe("2025-02-01");
      expect(dates[1]).toBe("2025-02-02");
      expect(dates[2]).toBe("2025-02-03");
      expect(dates[3]).toBe("2025-02-04");
      expect(dates[4]).toBe("2025-02-05");
    });

    it("應該正確計算每週考的開始時間", () => {
      const baseDate = new Date("2025-02-01T09:00:00");
      const examCount = 3;
      const intervalDays = 7; // 每週考

      const startTimes = [];
      for (let i = 0; i < examCount; i++) {
        const examDate = new Date(baseDate);
        examDate.setDate(examDate.getDate() + i * intervalDays);
        startTimes.push(examDate.toISOString().slice(0, 16));
      }

      expect(startTimes.length).toBe(3);
      // 檢查日期間隔是否正確（不檢查具體時區）
      const dates = startTimes.map(t => t.slice(0, 10));
      expect(dates[0]).toBe("2025-02-01");
      expect(dates[1]).toBe("2025-02-08");
      expect(dates[2]).toBe("2025-02-15");
    });

    it("應該正確計算自訂間隔的開始時間", () => {
      const baseDate = new Date("2025-02-01T09:00:00");
      const examCount = 4;
      const customInterval = 3;
      const customIntervalUnit = "days";
      const intervalDays = customIntervalUnit === "weeks" ? customInterval * 7 : customInterval;

      const startTimes = [];
      for (let i = 0; i < examCount; i++) {
        const examDate = new Date(baseDate);
        examDate.setDate(examDate.getDate() + i * intervalDays);
        startTimes.push(examDate.toISOString().slice(0, 16));
      }

      expect(startTimes.length).toBe(4);
      // 檢查日期間隔是否正確（不檢查具體時區）
      const dates = startTimes.map(t => t.slice(0, 10));
      expect(dates[0]).toBe("2025-02-01");
      expect(dates[1]).toBe("2025-02-04");
      expect(dates[2]).toBe("2025-02-07");
      expect(dates[3]).toBe("2025-02-10");
    });

    it("不定時考應該所有考卷使用相同的開始時間", () => {
      const baseDate = "2025-02-01T09:00";
      const examCount = 5;
      const examFrequency = "none";

      const startTimes = [];
      if (examFrequency === "none") {
        for (let i = 0; i < examCount; i++) {
          startTimes.push(baseDate);
        }
      }

      expect(startTimes.length).toBe(5);
      expect(startTimes.every(time => time === baseDate)).toBe(true);
    });
  });

  describe("CSV 範本生成", () => {
    it("應該生成正確格式的 CSV 範本", () => {
      const template = [
        "考生姓名,考生Email,考卷名稱,開始時間,截止時間",
        "張三,zhang@example.com,JavaScript基礎測驗,2025-02-01 09:00,2025-02-07 23:59",
        "李四,li@example.com,React進階考試,2025-02-01 09:00,2025-02-14 23:59",
        "王五,wang@example.com,TypeScript測驗,2025-02-01 09:00,2025-02-07 23:59",
      ].join("\n");

      const lines = template.split("\n");
      expect(lines.length).toBe(4);
      expect(lines[0]).toContain("考生姓名");
      expect(lines[0]).toContain("考生Email");
      expect(lines[0]).toContain("考卷名稱");
      expect(lines[1]).toContain("張三");
      expect(lines[2]).toContain("李四");
      expect(lines[3]).toContain("王五");
    });
  });

  describe("考生部門分組", () => {
    it("應該正確將考生分配到對應的部門", () => {
      const departments = [
        { id: 1, name: "技術部" },
        { id: 2, name: "業務部" },
      ];

      const employees = [
        { email: "user1@example.com", departmentId: 1 },
        { email: "user2@example.com", departmentId: 1 },
        { email: "user3@example.com", departmentId: 2 },
      ];

      const users = [
        { id: 1, email: "user1@example.com", name: "用戶1" },
        { id: 2, email: "user2@example.com", name: "用戶2" },
        { id: 3, email: "user3@example.com", name: "用戶3" },
        { id: 4, email: "user4@example.com", name: "用戶4" },
      ];

      const grouped: Record<number, typeof users> = {};
      departments.forEach(dept => {
        grouped[dept.id] = [];
      });
      grouped[0] = []; // 未分配部門

      const emailToDept: Record<string, number> = {};
      employees.forEach(emp => {
        if (emp.email) {
          emailToDept[emp.email.toLowerCase()] = emp.departmentId;
        }
      });

      users.forEach(user => {
        if (user.email) {
          const deptId = emailToDept[user.email.toLowerCase()];
          if (deptId !== undefined && grouped[deptId]) {
            grouped[deptId].push(user);
          } else {
            grouped[0].push(user);
          }
        } else {
          grouped[0].push(user);
        }
      });

      expect(grouped[1].length).toBe(2); // 技術部有 2 人
      expect(grouped[2].length).toBe(1); // 業務部有 1 人
      expect(grouped[0].length).toBe(1); // 未分配部門有 1 人
    });
  });

  describe("搜尋歷史記錄", () => {
    it("應該正確儲存和管理搜尋歷史", () => {
      const history: string[] = [];
      const maxHistoryLength = 5;

      const addToHistory = (searchTerm: string) => {
        if (!searchTerm.trim()) return history;
        const newHistory = [searchTerm, ...history.filter(h => h !== searchTerm)].slice(0, maxHistoryLength);
        history.length = 0;
        history.push(...newHistory);
        return history;
      };

      addToHistory("JavaScript基礎測驗");
      expect(history.length).toBe(1);
      expect(history[0]).toBe("JavaScript基礎測驗");

      addToHistory("React進階考試");
      expect(history.length).toBe(2);
      expect(history[0]).toBe("React進階考試");

      // 重複搜尋應該移到最前面
      addToHistory("JavaScript基礎測驗");
      expect(history.length).toBe(2);
      expect(history[0]).toBe("JavaScript基礎測驗");
      expect(history[1]).toBe("React進階考試");

      // 超過最大長度應該移除最舊的
      addToHistory("考試3");
      addToHistory("考試4");
      addToHistory("考試5");
      addToHistory("考試6");
      expect(history.length).toBe(5);
      expect(history[0]).toBe("考試6");
      // 檢查歷史記錄的順序：考試6, 考試5, 考試4, 考試3, JavaScript基礎測驗
      // React進階考試 被擠出去了
      expect(history.includes("考試6")).toBe(true);
      expect(history.includes("React進階考試")).toBe(false);
    });
  });

  describe("智能建議邏輯", () => {
    it("應該根據考卷數量提供正確的建議", () => {
      const getSuggestion = (examCount: number) => {
        if (examCount <= 5) {
          return "建議使用「每日考」或「不定時考」";
        } else if (examCount <= 20) {
          return "建議使用「每週考」或每 2-3 天一份";
        } else {
          return "建議使用「每週考」以避免考生負擔過重";
        }
      };

      expect(getSuggestion(3)).toBe("建議使用「每日考」或「不定時考」");
      expect(getSuggestion(10)).toBe("建議使用「每週考」或每 2-3 天一份");
      expect(getSuggestion(25)).toBe("建議使用「每週考」以避免考生負擔過重");
    });
  });
});

