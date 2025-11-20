import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar, text } from "drizzle-orm/mysql-core";

// 定義tags表結構
const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
});

const db = drizzle(process.env.DATABASE_URL);

const newTags = [
  // 業界分類（8個）
  { name: "裝前評估", category: "業界分類", description: "裝修前的規劃、預算、需求評估等準備工作" },
  { name: "風格靈感", category: "業界分類", description: "各種室內設計風格的介紹、案例和靈感來源" },
  { name: "裝修知識", category: "業界分類", description: "裝修過程中的實用知識、技巧和注意事項" },
  { name: "空間設計", category: "業界分類", description: "各種空間的設計規劃和布局技巧" },
  { name: "工程施工", category: "業界分類", description: "裝修施工過程中的工程技術和施工要點" },
  { name: "建材百科", category: "業界分類", description: "各種建材的特性、選擇和應用知識" },
  { name: "家具家電", category: "業界分類", description: "家具和家電的選購、搭配和使用建議" },
  { name: "軟裝搭配", category: "業界分類", description: "窗簾、抱枕、擺飾等軟裝元素的搭配技巧" },

  // 空間類型（10個）
  { name: "客廳", category: "空間類型", description: "客廳、起居室相關設計" },
  { name: "餐廳", category: "空間類型", description: "餐廳、用餐區相關設計" },
  { name: "衛浴", category: "空間類型", description: "浴室、廁所、淋浴間相關設計" },
  { name: "書房", category: "空間類型", description: "書房、工作室、閱讀區相關設計" },
  { name: "廚房", category: "空間類型", description: "廚房、料理區相關設計" },
  { name: "臥室", category: "空間類型", description: "臥室、睡房相關設計" },
  { name: "玄關", category: "空間類型", description: "玄關、入口、門廳相關設計" },
  { name: "陽台", category: "空間類型", description: "陽台、露台、戶外空間相關設計" },
  { name: "兒童房", category: "空間類型", description: "兒童房、小孩房、遊戲室相關設計" },
  { name: "衣帽間", category: "空間類型", description: "衣帽間、更衣室、衣櫃相關設計" },

  // 風格類型（9個）
  { name: "現代風", category: "風格類型", description: "現代、簡約、極簡、當代風格" },
  { name: "北歐風", category: "風格類型", description: "北歐、斯堪地那維亞、清新、明亮風格" },
  { name: "日式風", category: "風格類型", description: "日式、和風、禪風、無印風格" },
  { name: "工業風", category: "風格類型", description: "工業、loft、復古、粗獷風格" },
  { name: "美式風", category: "風格類型", description: "美式、鄉村、田園、溫馨風格" },
  { name: "新中式風", category: "風格類型", description: "新中式、中式、東方、禪意風格" },
  { name: "混搭風", category: "風格類型", description: "混搭、折衷、多元風格" },
  { name: "古典風", category: "風格類型", description: "古典、歐式、宮廷、華麗風格" },
  { name: "鄉村風", category: "風格類型", description: "鄉村、田園、自然、樸實風格" },
];

async function main() {
  console.log("開始建立新標籤...");

  for (const tag of newTags) {
    try {
      await db.insert(tags).values(tag);
      console.log(`✓ 建立標籤: ${tag.category} - ${tag.name}`);
    } catch (error) {
      console.error(`✗ 建立標籤失敗: ${tag.category} - ${tag.name}`, error.message);
    }
  }

  console.log("\n標籤建立完成！");
  console.log(`總計建立: ${newTags.length} 個標籤`);
  console.log("- 業界分類: 8 個");
  console.log("- 空間類型: 10 個");
  console.log("- 風格類型: 9 個");

  process.exit(0);
}

main().catch((error) => {
  console.error("執行失敗:", error);
  process.exit(1);
});

