import { getDb } from "./db";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

/**
 * 自動評分系統
 * 支援是非題、選擇題自動批改，問答題AI評分
 */

interface GradingResult {
  isCorrect: boolean;
  score: number;
  aiEvaluation?: {
    score: number;
    reasoning: string;
    suggestions: string[];
  };
}

/**
 * 評分單一題目
 */
export async function gradeQuestion(
  questionId: number,
  studentAnswer: string,
  maxScore: number
): Promise<GradingResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { questions } = await import("../drizzle/schema");
  
  // 取得題目資訊
  const questionResult = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);
  
  if (questionResult.length === 0) {
    throw new Error(`Question ${questionId} not found`);
  }
  
  const question = questionResult[0];
  const correctAnswer = question.correctAnswer;
  const questionType = question.type;
  
  // 根據題型進行評分
  switch (questionType) {
    case "true_false":
    case "multiple_choice":
      return gradeObjectiveQuestion(studentAnswer, correctAnswer, maxScore);
    
    case "short_answer":
      return await gradeEssayQuestion(
        question.question,
        studentAnswer,
        correctAnswer,
        maxScore
      );
    
    default:
      throw new Error(`Unknown question type: ${questionType}`);
  }
}

/**
 * 評分是非題或選擇題（客觀題）
 */
function gradeObjectiveQuestion(
  studentAnswer: string,
  correctAnswer: string,
  maxScore: number
): GradingResult {
  // 標準化答案（去除空白、轉小寫）
  const normalizedStudentAnswer = studentAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
  
  const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;
  
  return {
    isCorrect,
    score: isCorrect ? maxScore : 0,
  };
}

/**
 * 評分問答題（使用AI評分）
 */
async function gradeEssayQuestion(
  questionText: string,
  studentAnswer: string,
  referenceAnswer: string,
  maxScore: number
): Promise<GradingResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一位專業的考試評分老師。請根據題目、學生答案和參考答案，進行公正的評分。

評分標準：
- 完全正確且完整：100%分數
- 大部分正確但有小缺漏：70-90%分數
- 部分正確但有明顯錯誤：40-60%分數
- 基本概念錯誤或離題：0-30%分數
- 完全錯誤或未作答：0分

請以JSON格式回應，包含以下欄位：
- score: 0-100的分數（整數）
- reasoning: 評分理由（說明學生答案的優缺點）
- suggestions: 改進建議（字串陣列，最多3個建議）`,
        },
        {
          role: "user",
          content: `題目：${questionText}

參考答案：${referenceAnswer}

學生答案：${studentAnswer}

請評分並提供建議。`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "essay_grading",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: {
                type: "integer",
                description: "分數（0-100）",
              },
              reasoning: {
                type: "string",
                description: "評分理由",
              },
              suggestions: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "改進建議",
              },
            },
            required: ["score", "reasoning", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("AI evaluation returned empty content");
    }
    
    const aiEvaluation = JSON.parse(content);
    
    // 將0-100分數轉換為實際得分
    const actualScore = Math.round((aiEvaluation.score / 100) * maxScore);
    
    return {
      isCorrect: aiEvaluation.score >= 60, // 60分以上視為正確
      score: actualScore,
      aiEvaluation: {
        score: aiEvaluation.score,
        reasoning: aiEvaluation.reasoning,
        suggestions: aiEvaluation.suggestions,
      },
    };
  } catch (error) {
    console.error("AI grading error:", error);
    // AI評分失敗時，標記為待人工複核
    return {
      isCorrect: false,
      score: 0,
      aiEvaluation: {
        score: 0,
        reasoning: "AI評分失敗，需要人工複核",
        suggestions: ["請聯繫老師進行人工評分"],
      },
    };
  }
}

/**
 * 評分整份考試
 */
export async function gradeExam(assignmentId: number): Promise<{
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  details: Array<{
    questionId: number;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    aiEvaluation?: any;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const {
    examAssignments,
    examSubmissions,
    examQuestions,
    exams,
  } = await import("../drizzle/schema");
  
  // 取得考試指派資訊
  const assignmentResult = await db
    .select()
    .from(examAssignments)
    .where(eq(examAssignments.id, assignmentId))
    .limit(1);
  
  if (assignmentResult.length === 0) {
    throw new Error(`Assignment ${assignmentId} not found`);
  }
  
  const assignment = assignmentResult[0];
  const examId = assignment.examId;
  
  // 取得考試資訊（包含及格分數）
  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  
  if (examResult.length === 0) {
    throw new Error(`Exam ${examId} not found`);
  }
  
  const exam = examResult[0];
  const passingScore = exam.passingScore || 60;
  
  // 取得考試題目和分數配置
  const examQuestionsResult = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId));
  
  // 取得考生的答案
  const submissionsResult = await db
    .select()
    .from(examSubmissions)
    .where(eq(examSubmissions.assignmentId, assignmentId));
  
  // 建立答案對照表
  const answerMap = new Map<number, string>();
  submissionsResult.forEach((submission) => {
    answerMap.set(submission.questionId, submission.answer);
  });
  
  // 評分每一題
  const details: Array<{
    questionId: number;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    aiEvaluation?: any;
  }> = [];
  
  let totalScore = 0;
  let maxScore = 0;
  
  for (const examQuestion of examQuestionsResult) {
    const questionId = examQuestion.questionId;
    const questionMaxScore = examQuestion.score || 10; // 預設10分
    const studentAnswer = answerMap.get(questionId) || "";
    
    maxScore += questionMaxScore;
    
    if (!studentAnswer) {
      // 未作答
      details.push({
        questionId,
        isCorrect: false,
        score: 0,
        maxScore: questionMaxScore,
      });
      continue;
    }
    
    // 評分
    const gradingResult = await gradeQuestion(
      questionId,
      studentAnswer,
      questionMaxScore
    );
    
    totalScore += gradingResult.score;
    
    details.push({
      questionId,
      isCorrect: gradingResult.isCorrect,
      score: gradingResult.score,
      maxScore: questionMaxScore,
      aiEvaluation: gradingResult.aiEvaluation,
    });
    
    // 更新examSubmissions表格的評分結果
    await db
      .update(examSubmissions)
      .set({
        isCorrect: gradingResult.isCorrect ? 1 : 0,
        score: gradingResult.score,
        aiEvaluation: gradingResult.aiEvaluation
          ? JSON.stringify(gradingResult.aiEvaluation)
          : null,
      })
      .where(
        and(
          eq(examSubmissions.assignmentId, assignmentId),
          eq(examSubmissions.questionId, questionId)
        )
      );
  }
  
  // 計算百分比和是否及格
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= passingScore;
  
  return {
    totalScore,
    maxScore,
    percentage,
    passed,
    details,
  };
}

/**
 * 儲存考試成績
 */
export async function saveGradingResult(
  assignmentId: number,
  gradingResult: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
  },
  gradedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { examScores } = await import("../drizzle/schema");
  
  // 檢查是否已經有成績記錄
  const existing = await db
    .select()
    .from(examScores)
    .where(eq(examScores.assignmentId, assignmentId))
    .limit(1);
  
  const scoreData = {
    assignmentId,
    totalScore: gradingResult.totalScore,
    maxScore: gradingResult.maxScore,
    percentage: gradingResult.percentage,
    passed: gradingResult.passed ? 1 : 0,
    gradedBy: gradedBy || null,
    gradedAt: new Date(),
  };
  
  if (existing.length > 0) {
    // 更新現有記錄
    await db
      .update(examScores)
      .set(scoreData)
      .where(eq(examScores.assignmentId, assignmentId));
  } else {
    // 新增記錄
    await db.insert(examScores).values(scoreData);
  }
  
  return { success: true };
}

