import { drizzle } from "drizzle-orm/mysql2";
import { exams, users } from "./drizzle/schema.js";
import { desc, like } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查詢新人培訓測驗
const examResult = await db.select().from(exams).where(like(exams.title, '%新人培訓測驗%')).orderBy(desc(exams.id)).limit(1);
console.log("考試:", examResult[0]);

// 查詢當前使用者
const userResult = await db.select().from(users).orderBy(desc(users.id)).limit(1);
console.log("使用者:", userResult[0]);

process.exit(0);
