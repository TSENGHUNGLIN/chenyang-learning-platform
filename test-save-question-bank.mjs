import { drizzle } from "drizzle-orm/mysql2";
import { questions } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

// 模擬前端傳送的資料
const testQuestion = {
  type: 'multiple_choice',
  difficulty: 'medium',
  question: '測試題目',
  options: JSON.stringify({ A: '選項A', B: '選項B', C: '選項C', D: '選項D' }),
  correctAnswer: 'A',
  explanation: '這是解釋',
  source: '由AI分析生成',
  createdBy: 1,
};

console.log('測試資料:', testQuestion);

try {
  console.log('開始插入...');
  await db.insert(questions).values(testQuestion);
  console.log('✅ 插入成功！');
} catch (error) {
  console.error('❌ 插入失敗:', error);
  console.error('錯誤訊息:', error.message);
  console.error('錯誤堆疊:', error.stack);
}

process.exit(0);

