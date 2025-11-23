import fs from 'fs';
import iconv from 'iconv-lite';

// 讀取CSV檔案
const filePath = '/home/ubuntu/upload/晨陽同仁資料.csv';
const buffer = fs.readFileSync(filePath);

// 嘗試UTF-8編碼（先移除BOM）
let text = '';
try {
  text = buffer.toString('utf-8');
  // 移除 UTF-8 BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  console.log('✅ UTF-8編碼解析成功');
} catch (e) {
  console.log('❌ UTF-8編碼解析失敗，嘗試BIG5');
  text = iconv.decode(buffer, 'big5');
}

const lines = text.split('\n').filter(line => line.trim());
console.log(`\n📊 總行數: ${lines.length}`);

// 解析標題行
const headerLine = lines[0];
console.log(`\n📋 標題行: ${headerLine}`);

const headers = headerLine.split(',').map(h => h.trim().replace(/\s+/g, ''));
console.log(`\n📋 處理後的標題: ${headers.slice(0, 5).join(', ')}...`);

// 找到部門、姓名、郵件欄位
const deptIndex = headers.findIndex(h => h.includes('部門') || h === 'department');
const nameIndex = headers.findIndex(h => h.includes('姓名') || h === 'name');
const emailIndex = headers.findIndex(h => h.includes('MAIL') || h.includes('mail') || h.includes('郵件'));

console.log(`\n🔍 欄位索引:`);
console.log(`   部門索引: ${deptIndex}`);
console.log(`   姓名索引: ${nameIndex}`);
console.log(`   郵件索引: ${emailIndex}`);

// 解析前5筆資料
console.log(`\n📝 前5筆資料預覽:`);
lines.slice(1, 6).forEach((line, index) => {
  const columns = line.split(',').map(s => s.trim());
  const departmentName = columns[deptIndex] || '';
  const name = columns[nameIndex] || '';
  const email = emailIndex !== -1 ? (columns[emailIndex] || '') : '';
  
  console.log(`   ${index + 1}. 部門: "${departmentName}", 姓名: "${name}", 郵件: "${email}"`);
});

// 統計部門分布
const deptCount = {};
lines.slice(1).forEach(line => {
  const columns = line.split(',').map(s => s.trim());
  const departmentName = columns[deptIndex] || '';
  if (departmentName) {
    deptCount[departmentName] = (deptCount[departmentName] || 0) + 1;
  }
});

console.log(`\n📊 部門分布:`);
Object.entries(deptCount).forEach(([dept, count]) => {
  console.log(`   ${dept}: ${count} 人`);
});

