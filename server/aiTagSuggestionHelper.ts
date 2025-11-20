/**
 * AI自動標籤建議輔助函數
 * 根據題目內容自動建議分類和標籤
 */

// 業界分類關鍵字對照表
const industryKeywords: Record<string, string[]> = {
  "裝前評估": ["預算", "工期", "評估", "規劃", "交屋", "驗屋", "需求分析", "成本", "報價"],
  "風格靈感": ["風格", "北歐", "日式", "現代", "工業", "美式", "新中式", "混搭", "古典", "鄉村", "設計風格"],
  "裝修知識": ["隔間", "壁紙", "油漆", "風水", "禁忌", "技巧", "注意事項", "施工流程", "裝修步驟"],
  "空間設計": ["客廳", "餐廳", "臥室", "廚房", "衛浴", "玄關", "陽台", "動線", "收納", "布局", "空間規劃"],
  "工程施工": ["施工", "工程", "系統櫃", "隔音", "安裝", "驗收", "泥作", "木作", "水電"],
  "建材百科": ["建材", "材質", "門板", "流理台", "地板", "牆面", "天花板", "磁磚", "石材", "木材"],
  "家具家電": ["家具", "家電", "沙發", "床", "桌椅", "冰箱", "洗衣機", "電視", "燈具"],
  "軟裝搭配": ["軟裝", "窗簾", "抱枕", "擺飾", "配色", "搭配", "布藝", "裝飾"],
};

// 空間類型關鍵字對照表
const spaceKeywords: Record<string, string[]> = {
  "客廳": ["客廳", "起居室", "會客廳", "沙發區", "電視牆"],
  "餐廳": ["餐廳", "餐桌", "用餐區", "餐櫃"],
  "衛浴": ["衛浴", "浴室", "廁所", "洗手間", "淋浴間", "浴缸", "馬桶"],
  "書房": ["書房", "工作室", "閱讀區", "書桌", "書櫃"],
  "廚房": ["廚房", "料理區", "流理台", "廚具", "爐具"],
  "臥室": ["臥室", "睡房", "主臥", "次臥", "床鋪"],
  "玄關": ["玄關", "入口", "門廳", "鞋櫃"],
  "陽台": ["陽台", "露台", "戶外空間", "花園"],
  "兒童房": ["兒童房", "小孩房", "遊戲室", "嬰兒房"],
  "衣帽間": ["衣帽間", "更衣室", "衣櫃", "儲藏室"],
};

// 風格類型關鍵字對照表
const styleKeywords: Record<string, string[]> = {
  "現代風": ["現代", "簡約", "極簡", "當代", "簡潔"],
  "北歐風": ["北歐", "斯堪地那維亞", "清新", "明亮", "自然光"],
  "日式風": ["日式", "和風", "禪風", "無印", "木質", "榻榻米"],
  "工業風": ["工業", "loft", "復古", "粗獷", "裸露", "金屬"],
  "美式風": ["美式", "鄉村", "田園", "溫馨", "舒適"],
  "新中式風": ["新中式", "中式", "東方", "禪意", "水墨"],
  "混搭風": ["混搭", "折衷", "多元", "融合"],
  "古典風": ["古典", "歐式", "宮廷", "華麗", "奢華"],
  "鄉村風": ["鄉村", "田園", "自然", "樸實", "原木"],
};

/**
 * 根據題目內容建議標籤
 * @param questionText 題目文字
 * @param allTags 所有可用標籤
 * @returns 建議的標籤ID陣列
 */
export function suggestTags(questionText: string, allTags: Array<{ id: number; name: string; category: string }>): number[] {
  const suggestedTagIds: number[] = [];
  const lowerText = questionText.toLowerCase();

  // 建立標籤名稱到ID的對照表
  const tagNameToId = new Map(allTags.map(t => [t.name, t.id]));

  // 檢查業界分類關鍵字
  for (const [tagName, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      const tagId = tagNameToId.get(tagName);
      if (tagId && !suggestedTagIds.includes(tagId)) {
        suggestedTagIds.push(tagId);
      }
    }
  }

  // 檢查空間類型關鍵字
  for (const [tagName, keywords] of Object.entries(spaceKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      const tagId = tagNameToId.get(tagName);
      if (tagId && !suggestedTagIds.includes(tagId)) {
        suggestedTagIds.push(tagId);
      }
    }
  }

  // 檢查風格類型關鍵字
  for (const [tagName, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      const tagId = tagNameToId.get(tagName);
      if (tagId && !suggestedTagIds.includes(tagId)) {
        suggestedTagIds.push(tagId);
      }
    }
  }

  return suggestedTagIds;
}

/**
 * 根據題目內容建議分類
 * @param questionText 題目文字
 * @param allCategories 所有可用分類
 * @returns 建議的分類ID，如果沒有建議則返回null
 */
export function suggestCategory(questionText: string, allCategories: Array<{ id: number; name: string }>): number | null {
  const lowerText = questionText.toLowerCase();

  // 建立分類名稱到ID的對照表
  const categoryNameToId = new Map(allCategories.map(c => [c.name, c.id]));

  // 分類關鍵字對照表（根據現有的8大主分類）
  const categoryKeywords: Record<string, string[]> = {
    "設計美學": ["設計", "美學", "風格", "色彩", "搭配", "視覺", "美感"],
    "工程管理": ["工程", "施工", "材料", "品質", "工期", "監工"],
    "客戶關係": ["客戶", "溝通", "需求", "提案", "服務", "滿意度"],
    "廠商管理": ["廠商", "供應商", "合約", "協調", "採購"],
    "專業溝通": ["圖面", "表達", "簡報", "文件", "報告"],
    "制度流程": ["制度", "流程", "SOP", "規範", "標準"],
    "領導管理": ["領導", "管理", "團隊", "時間", "問題解決"],
    "法規知識": ["法規", "建築法", "消防", "合約", "法律"],
  };

  // 檢查每個分類的關鍵字
  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      const categoryId = categoryNameToId.get(categoryName);
      if (categoryId) {
        return categoryId;
      }
    }
  }

  return null;
}

/**
 * 獲取AI生成標籤的ID
 * @param allTags 所有可用標籤
 * @returns AI生成標籤的ID，如果不存在則返回null
 */
export function getAiGeneratedTagId(allTags: Array<{ id: number; name: string; category: string }>): number | null {
  const aiTag = allTags.find(t => t.name === "AI生成" && t.category === "題目來源");
  return aiTag ? aiTag.id : null;
}

