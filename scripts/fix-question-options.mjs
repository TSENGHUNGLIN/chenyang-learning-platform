#!/usr/bin/env node

/**
 * 資料庫清理腳本：修復題目選項格式
 * 
 * 功能：
 * 1. 掃描所有題目的 options 欄位
 * 2. 識別物件格式的選項並轉換為陣列格式
 * 3. 執行批次修復並記錄修復結果
 * 
 * 使用方式：
 * node scripts/fix-question-options.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// 建立資料庫連接
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('🔍 開始掃描題目選項格式...\n');

// 查詢所有選擇題
const questions = await connection.execute(
  `SELECT id, question, options, type FROM questions WHERE type = 'multiple_choice' AND options IS NOT NULL`
);

const rows = questions[0];
console.log(`📊 找到 ${rows.length} 道選擇題\n`);

let fixedCount = 0;
let errorCount = 0;
let alreadyCorrectCount = 0;

for (const row of rows) {
  try {
    const options = row.options;
    
    // 嘗試解析 JSON
    let parsedOptions;
    try {
      parsedOptions = JSON.parse(options);
    } catch (e) {
      console.log(`❌ 題目 ID ${row.id} 的選項無法解析為 JSON，跳過`);
      errorCount++;
      continue;
    }
    
    // 檢查是否已經是陣列格式
    if (Array.isArray(parsedOptions)) {
      alreadyCorrectCount++;
      continue;
    }
    
    // 轉換物件格式為陣列格式
    const optionsArray = Object.values(parsedOptions);
    const newOptionsJson = JSON.stringify(optionsArray);
    
    // 更新資料庫
    await connection.execute(
      `UPDATE questions SET options = ? WHERE id = ?`,
      [newOptionsJson, row.id]
    );
    
    console.log(`✅ 修復題目 ID ${row.id}`);
    console.log(`   原格式: ${options}`);
    console.log(`   新格式: ${newOptionsJson}\n`);
    
    fixedCount++;
  } catch (error) {
    console.log(`❌ 處理題目 ID ${row.id} 時發生錯誤:`, error.message);
    errorCount++;
  }
}

console.log('\n📈 修復結果統計：');
console.log(`   ✅ 已修復: ${fixedCount} 道題目`);
console.log(`   ✔️  格式正確: ${alreadyCorrectCount} 道題目`);
console.log(`   ❌ 錯誤: ${errorCount} 道題目`);
console.log(`   📊 總計: ${rows.length} 道題目\n`);

// 關閉連接
await connection.end();

console.log('✨ 資料庫清理完成！');

