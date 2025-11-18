import { getDb } from "./db";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

/**
 * 成績匯出功能模組
 */

/**
 * 匯出考試成績為Excel格式
 */
export async function exportExamScoresToExcel(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    examAssignments,
    examScores,
    exams,
    users,
    examSubmissions,
    questions,
  } = await import("../drizzle/schema");

  // 取得考試資訊
  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  if (examResult.length === 0) {
    throw new Error(`Exam ${examId} not found`);
  }

  const exam = examResult[0];

  // 取得所有考試指派和成績
  const assignments = await db
    .select({
      assignmentId: examAssignments.id,
      userId: examAssignments.userId,
      userName: users.name,
      userEmail: users.email,
      status: examAssignments.status,
      startedAt: examAssignments.startedAt,
      submittedAt: examAssignments.submittedAt,
      totalScore: examScores.totalScore,
      maxScore: examScores.maxScore,
      percentage: examScores.percentage,
      passed: examScores.passed,
      gradedAt: examScores.gradedAt,
      feedback: examScores.feedback,
    })
    .from(examAssignments)
    .leftJoin(users, eq(examAssignments.userId, users.id))
    .leftJoin(examScores, eq(examScores.assignmentId, examAssignments.id))
    .where(eq(examAssignments.examId, examId));

  // 準備Excel資料
  const worksheetData = [
    // 標題行
    ["考試名稱", exam.title],
    ["考試說明", exam.description || ""],
    ["時間限制", `${exam.timeLimit || 60} 分鐘`],
    ["及格分數", `${exam.passingScore || 60} 分`],
    ["總分", `${exam.totalScore || 100} 分`],
    ["匯出時間", new Date().toLocaleString("zh-TW")],
    [],
    // 成績表頭
    [
      "排名",
      "姓名",
      "Email",
      "狀態",
      "得分",
      "滿分",
      "百分比",
      "結果",
      "開始時間",
      "提交時間",
      "評分時間",
      "評語",
    ],
  ];

  // 按分數排序
  const sortedAssignments = assignments
    .filter((a) => a.totalScore !== null)
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  // 填入成績資料
  sortedAssignments.forEach((assignment, index) => {
    const statusMap: Record<string, string> = {
      pending: "待考",
      in_progress: "進行中",
      submitted: "已提交",
      graded: "已評分",
    };

    worksheetData.push([
      index + 1,
      assignment.userName || "-",
      assignment.userEmail || "-",
      statusMap[assignment.status] || assignment.status,
      assignment.totalScore || "-",
      assignment.maxScore || "-",
      assignment.percentage !== null ? `${assignment.percentage}%` : "-",
      assignment.passed === 1 ? "及格" : assignment.passed === 0 ? "不及格" : "-",
      assignment.startedAt
        ? new Date(assignment.startedAt).toLocaleString("zh-TW")
        : "-",
      assignment.submittedAt
        ? new Date(assignment.submittedAt).toLocaleString("zh-TW")
        : "-",
      assignment.gradedAt
        ? new Date(assignment.gradedAt).toLocaleString("zh-TW")
        : "-",
      assignment.feedback || "-",
    ]);
  });

  // 建立工作簿
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // 設定欄寬
  worksheet["!cols"] = [
    { wch: 6 },  // 排名
    { wch: 15 }, // 姓名
    { wch: 25 }, // Email
    { wch: 10 }, // 狀態
    { wch: 8 },  // 得分
    { wch: 8 },  // 滿分
    { wch: 10 }, // 百分比
    { wch: 8 },  // 結果
    { wch: 20 }, // 開始時間
    { wch: 20 }, // 提交時間
    { wch: 20 }, // 評分時間
    { wch: 30 }, // 評語
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "成績總覽");

  // 建立詳細答題記錄工作表
  const detailData = [
    ["姓名", "題號", "題目類型", "題目", "正確答案", "考生答案", "是否正確", "得分", "滿分", "教師評語"],
  ];

  for (const assignment of sortedAssignments) {
    const submissions = await db
      .select({
        questionId: examSubmissions.questionId,
        answer: examSubmissions.answer,
        isCorrect: examSubmissions.isCorrect,
        score: examSubmissions.score,
        teacherComment: examSubmissions.teacherComment,
        questionType: questions.type,
        questionText: questions.question,
        correctAnswer: questions.correctAnswer,
        questionScore: questions.score,
      })
      .from(examSubmissions)
      .leftJoin(questions, eq(examSubmissions.questionId, questions.id))
      .where(eq(examSubmissions.assignmentId, assignment.assignmentId));

    submissions.forEach((sub, index) => {
      detailData.push([
        assignment.userName || "-",
        `第 ${index + 1} 題`,
        sub.questionType || "-",
        sub.questionText || "-",
        sub.correctAnswer || "-",
        sub.answer || "-",
        sub.isCorrect === 1 ? "正確" : sub.isCorrect === 0 ? "錯誤" : "待評分",
        sub.score || 0,
        sub.questionScore || 0,
        sub.teacherComment || "-",
      ]);
    });
  }

  const detailWorksheet = XLSX.utils.aoa_to_sheet(detailData);
  detailWorksheet["!cols"] = [
    { wch: 15 }, // 姓名
    { wch: 10 }, // 題號
    { wch: 10 }, // 題目類型
    { wch: 40 }, // 題目
    { wch: 20 }, // 正確答案
    { wch: 20 }, // 考生答案
    { wch: 10 }, // 是否正確
    { wch: 8 },  // 得分
    { wch: 8 },  // 滿分
    { wch: 30 }, // 教師評語
  ];

  XLSX.utils.book_append_sheet(workbook, detailWorksheet, "答題詳情");

  // 轉換為Buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return {
    buffer,
    filename: `${exam.title}_成績報表_${new Date().toISOString().split("T")[0]}.xlsx`,
  };
}

/**
 * 匯出考試統計為Excel格式
 */
export async function exportExamStatisticsToExcel(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { getExamStatistics, getWrongAnswerRanking } = await import("./examStatistics");

  // 取得統計資料
  const statistics = await getExamStatistics(examId);
  const wrongAnswers = await getWrongAnswerRanking(examId);

  const { exams } = await import("../drizzle/schema");
  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  if (examResult.length === 0) {
    throw new Error(`Exam ${examId} not found`);
  }

  const exam = examResult[0];

  // 準備Excel資料
  const worksheetData = [
    ["考試名稱", exam.title],
    ["匯出時間", new Date().toLocaleString("zh-TW")],
    [],
    ["統計項目", "數值"],
    ["參加人數", statistics.totalStudents],
    ["平均分數", statistics.averageScore.toFixed(2)],
    ["及格人數", statistics.passedStudents],
    ["不及格人數", statistics.failedStudents],
    ["及格率", `${statistics.passRate.toFixed(2)}%`],
    [],
    ["分數區間", "人數", "百分比"],
  ];

  // 填入分數分布
  statistics.scoreDistribution.forEach((dist) => {
    worksheetData.push([
      dist.range,
      dist.count,
      `${dist.percentage.toFixed(2)}%`,
    ]);
  });

  worksheetData.push([]);
  worksheetData.push(["錯題排行榜"]);
  worksheetData.push(["題號", "題目", "錯誤次數", "錯誤率"]);

  // 填入錯題排行
  wrongAnswers.forEach((item) => {
    worksheetData.push([
      `第 ${item.questionNumber} 題`,
      item.questionText,
      item.wrongCount,
      `${item.wrongRate.toFixed(2)}%`,
    ]);
  });

  // 建立工作簿
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  worksheet["!cols"] = [
    { wch: 20 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "統計分析");

  // 轉換為Buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return {
    buffer,
    filename: `${exam.title}_統計分析_${new Date().toISOString().split("T")[0]}.xlsx`,
  };
}

