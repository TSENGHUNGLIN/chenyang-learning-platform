import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 查詢所有員工和部門資料
const employeesQuery = await connection.query("SELECT id, name, email, departmentId FROM employees ORDER BY departmentId, name");
const departmentsQuery = await connection.query("SELECT id, name FROM departments ORDER BY id");
const usersQuery = await connection.query("SELECT id, name, email FROM users ORDER BY id");

console.log("\n=== 部門資料 ===");
console.log(JSON.stringify(departmentsQuery[0], null, 2));

console.log("\n=== 員工資料（employees 表） ===");
console.log(JSON.stringify(employeesQuery[0], null, 2));

console.log("\n=== 使用者資料（users 表） ===");
console.log(JSON.stringify(usersQuery[0], null, 2));

// 統計每個部門的員工數量
const deptStats = {};
employeesQuery[0].forEach(emp => {
  const deptId = emp.departmentId || 0;
  deptStats[deptId] = (deptStats[deptId] || 0) + 1;
});

console.log("\n=== 部門員工統計 ===");
console.log(JSON.stringify(deptStats, null, 2));

await connection.end();
