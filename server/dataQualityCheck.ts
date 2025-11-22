import { getDb } from "./db";

/**
 * 檢查所有題目的資料品質
 * 返回格式錯誤的題目列表
 */
export async function checkQuestionsQuality() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 查詢所有題目
  const [allQuestions] = await db.execute(`
    SELECT id, question, type, options, correctAnswer, difficulty
    FROM questions
  `);

  const questions = allQuestions as any[];
  const totalQuestions = questions.length;
  const invalidOptionsQuestions: any[] = [];
  const missingFieldsQuestions: any[] = [];

  for (const q of questions) {
    const missingFields: string[] = [];

    // 檢查必要欄位
    if (!q.question || q.question.trim() === '') {
      missingFields.push('question');
    }
    if (!q.correctAnswer || q.correctAnswer.trim() === '') {
      missingFields.push('correctAnswer');
    }

    // 檢查選擇題的選項格式
    if (q.type === 'multiple_choice') {
      if (!q.options) {
        missingFields.push('options');
      } else {
        try {
          const parsedOptions = JSON.parse(q.options);
          
          // 檢查是否為陣列
          if (!Array.isArray(parsedOptions)) {
            invalidOptionsQuestions.push({
              id: q.id,
              question: q.question,
              type: q.type,
              options: q.options,
              issue: '選項不是陣列格式',
            });
          } else if (parsedOptions.length === 0) {
            // 檢查陣列是否為空
            invalidOptionsQuestions.push({
              id: q.id,
              question: q.question,
              type: q.type,
              options: q.options,
              issue: '選項陣列為空',
            });
          } else {
            // 檢查每個選項是否有內容
            const hasEmptyOption = parsedOptions.some((opt: any) => {
              if (typeof opt === 'string') {
                return !opt.trim();
              }
              if (typeof opt === 'object' && opt !== null) {
                return !opt.label || !opt.value;
              }
              return true;
            });
            
            if (hasEmptyOption) {
              invalidOptionsQuestions.push({
                id: q.id,
                question: q.question,
                type: q.type,
                options: q.options,
                issue: '包含空選項',
              });
            }
          }
        } catch (error) {
          invalidOptionsQuestions.push({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options,
            issue: 'JSON 格式錯誤',
          });
        }
      }
    }

    if (missingFields.length > 0) {
      missingFieldsQuestions.push({
        id: q.id,
        question: q.question,
        type: q.type,
        missingFields,
      });
    }
  }

  return {
    totalQuestions,
    invalidOptionsQuestions,
    missingFieldsQuestions,
  };
}

/**
 * 批次修復選項格式問題
 * 將物件格式的選項轉換為陣列格式
 */
export async function fixOptionsFormat() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 查詢所有選擇題
  const [questions] = await db.execute(`
    SELECT id, options
    FROM questions
    WHERE type = 'multiple_choice' AND options IS NOT NULL
  `);

  const rows = questions as any[];
  let fixedCount = 0;

  for (const row of rows) {
    try {
      const parsedOptions = JSON.parse(row.options);
      
      // 如果已經是陣列格式，跳過
      if (Array.isArray(parsedOptions)) {
        continue;
      }
      
      // 轉換物件格式為陣列格式
      const optionsArray = Object.values(parsedOptions);
      const newOptionsJson = JSON.stringify(optionsArray);
      
      // 更新資料庫
      await db.execute(
        `UPDATE questions SET options = ? WHERE id = ?`,
        [newOptionsJson, row.id]
      );
      
      fixedCount++;
    } catch (error) {
      console.error(`Failed to fix question ${row.id}:`, error);
    }
  }

  return { fixedCount };
}

