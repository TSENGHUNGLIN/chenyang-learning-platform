import { getDb } from "./server/db";
import { departments, employees } from "./drizzle/schema";

async function seedData() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  try {
    // 建立部門
    const deptResult = await db.insert(departments).values([
      { name: "業管部" },
      { name: "行銷部" },
      { name: "設計部" },
      { name: "業務部" },
      { name: "工務部" },
    ]);
    console.log("Departments created");

    // 取得業務部ID
    const depts = await db.select().from(departments);
    const salesDept = depts.find(d => d.name === "業務部");
    
    if (!salesDept) {
      console.error("Sales department not found");
      return;
    }

    // 建立人員
    await db.insert(employees).values([
      { name: "蔣昀眞", departmentId: salesDept.id },
      { name: "邱紫郁", departmentId: salesDept.id },
    ]);
    console.log("Employees created");

    console.log("✅ Seed data completed successfully");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

seedData();
