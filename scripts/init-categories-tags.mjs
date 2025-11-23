/**
 * 批次建立室內設計業專用分類和標籤
 * 執行方式：node scripts/init-categories-tags.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { questionCategories, tags } from '../drizzle/schema.js';

// 資料庫連線
const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

// 8大主分類及其子分類
const categories = [
  {
    name: '設計美學',
    description: '室內設計美學相關知識，包含色彩、空間、風格等',
    children: [
      { name: '設計基礎', description: '色彩理論、空間規劃、材質搭配、照明設計' },
      { name: '風格流派', description: '現代簡約、北歐風格、新中式、輕奢風格、工業風格' },
      { name: '設計實務', description: '平面配置、立面設計、軟裝搭配、設計提案' },
    ]
  },
  {
    name: '工程管理',
    description: '工程施工與管理相關知識',
    children: [
      { name: '施工技術', description: '水電、泥作、木作、油漆、系統櫃工程' },
      { name: '工程監造', description: '施工圖審核、現場監工、品質管控、進度管理' },
      { name: '工程估算', description: '材料估算、工時計算、成本控制、報價技巧' },
    ]
  },
  {
    name: '客戶關係',
    description: '客戶開發、溝通與維護',
    children: [
      { name: '客戶開發', description: '市場分析、客戶來源、接案技巧、提案簡報' },
      { name: '需求溝通', description: '需求訪談、預算討論、風格確認、期望管理' },
      { name: '客戶維護', description: '售後服務、客訴處理、關係維繫、轉介推薦' },
    ]
  },
  {
    name: '廠商管理',
    description: '供應商與協力廠商管理',
    children: [
      { name: '廠商評選', description: '供應商評估、報價比較、品質審核、合約簽訂' },
      { name: '協調溝通', description: '工程協調、進度追蹤、問題處理、驗收標準' },
      { name: '關係維護', description: '長期合作、議價技巧、糾紛處理、資源整合' },
    ]
  },
  {
    name: '專業溝通',
    description: '內外部溝通與文件撰寫',
    children: [
      { name: '內部溝通', description: '團隊協作、跨部門溝通、會議技巧、簡報能力' },
      { name: '外部溝通', description: '客戶溝通、廠商溝通、政府單位、社區管委會' },
      { name: '文件撰寫', description: '設計說明、工程合約、會議記錄、專案報告' },
    ]
  },
  {
    name: '制度流程',
    description: '公司制度與專案流程',
    children: [
      { name: '公司制度', description: '人事制度、財務制度、行政制度、獎懲制度' },
      { name: '專案流程', description: '接案流程、設計流程、施工流程、驗收流程' },
      { name: '品質管理', description: 'ISO標準、品質檢核、文件管理、持續改善' },
    ]
  },
  {
    name: '領導管理',
    description: '團隊領導與專案管理',
    children: [
      { name: '團隊領導', description: '目標設定、任務分配、績效管理、激勵技巧' },
      { name: '專案管理', description: '時程規劃、資源調度、風險管理、成本控制' },
      { name: '人才培育', description: '新人訓練、技能培養、職涯規劃、接班人計畫' },
    ]
  },
  {
    name: '法規知識',
    description: '建築法規與商業法規',
    children: [
      { name: '建築法規', description: '建築技術規則、消防法規、無障礙規範、綠建築標準' },
      { name: '勞安環保', description: '職業安全衛生、環保法規、廢棄物處理、噪音管制' },
      { name: '商業法規', description: '契約法、智慧財產權、消費者保護、公平交易' },
    ]
  },
];

// 8類標籤體系
const tagGroups = [
  {
    group: '難度標籤',
    color: '#10b981', // 綠色
    tags: [
      { name: '基礎', description: '新人必備知識' },
      { name: '中階', description: '1-3年經驗' },
      { name: '進階', description: '3-5年經驗' },
      { name: '專家', description: '5年以上資深人員' },
    ]
  },
  {
    group: '職位標籤',
    color: '#3b82f6', // 藍色
    tags: [
      { name: '設計助理', description: '初階設計人員' },
      { name: '設計師', description: '一般設計師' },
      { name: '資深設計師', description: '資深設計師' },
      { name: '設計主管', description: '設計部門主管' },
      { name: '專案經理', description: '專案管理人員' },
      { name: '工程監造', description: '工程監造人員' },
      { name: '業務人員', description: '業務開發人員' },
    ]
  },
  {
    group: '考核類型',
    color: '#8b5cf6', // 紫色
    tags: [
      { name: '新人培訓', description: '新進人員培訓' },
      { name: '試用期考核', description: '試用期評估' },
      { name: '轉正考核', description: '轉正式員工考核' },
      { name: '季度考核', description: '季度績效考核' },
      { name: '年度考核', description: '年度績效考核' },
      { name: '晉升考核', description: '職位晉升評估' },
      { name: '專業認證', description: '專業技能認證' },
    ]
  },
  {
    group: '技能類型',
    color: '#f97316', // 橙色
    tags: [
      { name: '設計能力', description: '設計相關技能' },
      { name: '工程知識', description: '工程技術知識' },
      { name: '溝通協調', description: '溝通協調能力' },
      { name: '專案管理', description: '專案管理能力' },
      { name: '成本控制', description: '成本控制能力' },
      { name: '客戶服務', description: '客戶服務能力' },
      { name: '團隊領導', description: '團隊領導能力' },
    ]
  },
  {
    group: '軟體工具',
    color: '#06b6d4', // 青色
    tags: [
      { name: 'AutoCAD', description: 'AutoCAD繪圖軟體' },
      { name: 'SketchUp', description: 'SketchUp 3D建模' },
      { name: '3ds Max', description: '3ds Max渲染' },
      { name: 'Photoshop', description: 'Photoshop影像處理' },
      { name: 'Illustrator', description: 'Illustrator向量繪圖' },
      { name: 'Revit', description: 'Revit BIM建模' },
      { name: 'Enscape', description: 'Enscape即時渲染' },
    ]
  },
  {
    group: '重要程度',
    color: '#ef4444', // 紅色
    tags: [
      { name: '必考', description: '核心知識，必須掌握' },
      { name: '常考', description: '經常出現的題目' },
      { name: '選考', description: '進階選修內容' },
    ]
  },
  {
    group: '題目來源',
    color: '#6b7280', // 灰色
    tags: [
      { name: 'AI生成', description: '由AI分析產生' },
      { name: '實際案例', description: '真實專案經驗' },
      { name: '教材整理', description: '培訓教材' },
      { name: '法規條文', description: '法規相關' },
      { name: '業界標準', description: '行業規範' },
    ]
  },
  {
    group: '更新狀態',
    color: '#f59e0b', // 黃色
    tags: [
      { name: '最新', description: '近期新增' },
      { name: '已更新', description: '內容已修訂' },
      { name: '待更新', description: '需要檢視' },
      { name: '已過時', description: '不再適用' },
    ]
  },
];

async function main() {
  console.log('🚀 開始建立室內設計業分類和標籤...\n');

  try {
    // 建立分類
    console.log('📁 建立分類架構...');
    let categoryCount = 0;
    
    for (const mainCategory of categories) {
      // 建立主分類
      const [mainResult] = await db.insert(questionCategories).values({
        name: mainCategory.name,
        description: mainCategory.description,
        parentId: null,
      });
      
      const mainCategoryId = mainResult.insertId;
      categoryCount++;
      console.log(`  ✅ ${mainCategory.name}`);
      
      // 建立子分類
      for (const subCategory of mainCategory.children) {
        await db.insert(questionCategories).values({
          name: subCategory.name,
          description: subCategory.description,
          parentId: mainCategoryId,
        });
        categoryCount++;
        console.log(`     └─ ${subCategory.name}`);
      }
    }
    
    console.log(`\n✅ 共建立 ${categoryCount} 個分類\n`);

    // 建立標籤
    console.log('🏷️  建立標籤體系...');
    let tagCount = 0;
    
    for (const group of tagGroups) {
      console.log(`  📌 ${group.group}（顏色：${group.color}）`);
      
      for (const tag of group.tags) {
        await db.insert(tags).values({
          name: tag.name,
          color: group.color,
        });
        tagCount++;
        console.log(`     ✅ ${tag.name}`);
      }
    }
    
    console.log(`\n✅ 共建立 ${tagCount} 個標籤\n`);

    console.log('🎉 所有分類和標籤建立完成！');
    console.log('\n📊 統計資訊：');
    console.log(`   - 主分類：8 個`);
    console.log(`   - 子分類：${categoryCount - 8} 個`);
    console.log(`   - 總分類：${categoryCount} 個`);
    console.log(`   - 標籤群組：8 類`);
    console.log(`   - 總標籤：${tagCount} 個`);
    
  } catch (error) {
    console.error('❌ 發生錯誤：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

