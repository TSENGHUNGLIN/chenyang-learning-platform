import { drizzle } from 'drizzle-orm/mysql2';
import { questions } from './drizzle/schema';

const db = drizzle(process.env.DATABASE_URL);
const result = await db.select({
  id: questions.id,
  question: questions.question,
  type: questions.type
}).from(questions).limit(6);

console.log('前6個題目的類型：');
result.forEach((q, i) => {
  console.log(`${i+1}. ID: ${q.id}, 類型: ${q.type}, 題目: ${q.question.substring(0, 40)}...`);
});
process.exit(0);

