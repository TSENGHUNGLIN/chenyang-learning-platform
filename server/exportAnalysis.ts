import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

interface AnalysisResult {
  summary: string;
  difficulty: {
    level: string;
    score: number;
    reasoning: string;
  };
  performance: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  knowledgeGaps: Array<{
    topic: string;
    importance: string;
    recommendation: string;
  }>;
  recommendedQuestions: Array<{
    title: string;
    reason: string;
    difficulty: string;
  }>;
  questionsOnly?: Array<{
    number: number;
    question: string;
    type: string;
    options?: string[];
  }>;
  questionsWithAnswers?: Array<{
    number: number;
    question: string;
    type: string;
    options?: string[];
    answer: string;
    explanation?: string;
  }>;
}

/**
 * 將分析結果轉換為Markdown格式
 */
function analysisToMarkdown(result: AnalysisResult, fileNames: string[]): string {
  let md = `# AI 分析報告\n\n`;
  md += `## 分析檔案\n\n`;
  fileNames.forEach((name, index) => {
    md += `${index + 1}. ${name}\n`;
  });
  md += `\n---\n\n`;

  md += `## 整體摘要\n\n${result.summary}\n\n`;

  md += `## 難度評估\n\n`;
  md += `- **難度等級**: ${result.difficulty.level}\n`;
  md += `- **難度分數**: ${result.difficulty.score}/100\n`;
  md += `- **評估理由**: ${result.difficulty.reasoning}\n\n`;

  md += `## 答題表現分析\n\n`;
  md += `### ✓ 優勢\n\n`;
  result.performance.strengths.forEach((s) => {
    md += `- ${s}\n`;
  });
  md += `\n### ✗ 弱點\n\n`;
  result.performance.weaknesses.forEach((w) => {
    md += `- ${w}\n`;
  });
  md += `\n### 💡 改進建議\n\n`;
  result.performance.suggestions.forEach((s) => {
    md += `- ${s}\n`;
  });

  if (result.knowledgeGaps.length > 0) {
    md += `\n## 需要加強的知識點\n\n`;
    result.knowledgeGaps.forEach((gap, index) => {
      md += `### ${index + 1}. ${gap.topic}\n\n`;
      md += `- **重要性**: ${gap.importance}\n`;
      md += `- **學習建議**: ${gap.recommendation}\n\n`;
    });
  }

  if (result.recommendedQuestions.length > 0) {
    md += `\n## 推薦相關考題\n\n`;
    result.recommendedQuestions.forEach((q, index) => {
      md += `### ${index + 1}. ${q.title}\n\n`;
      md += `- **難度**: ${q.difficulty}\n`;
      md += `- **推薦理由**: ${q.reason}\n\n`;
    });
  }

  // 題目整理（不含答案）
  if (result.questionsOnly && result.questionsOnly.length > 0) {
    md += `\n## 題目整理\n\n`;
    md += `以下是根據檔案內容生成的考題，不含答案。\n\n`;
    result.questionsOnly.forEach((q) => {
      md += `### ${q.number}. ${q.question}\n\n`;
      md += `- **題型**: ${q.type}\n`;
      if (q.options && q.options.length > 0) {
        md += `\n**選項**:\n\n`;
        q.options.forEach((opt, idx) => {
          md += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
        });
      }
      md += `\n`;
    });
  }

  // 題目與答案
  if (result.questionsWithAnswers && result.questionsWithAnswers.length > 0) {
    md += `\n## 題目與答案\n\n`;
    md += `完整的考題和答案解析。\n\n`;
    result.questionsWithAnswers.forEach((q) => {
      md += `### ${q.number}. ${q.question}\n\n`;
      md += `- **題型**: ${q.type}\n`;
      if (q.options && q.options.length > 0) {
        md += `\n**選項**:\n\n`;
        q.options.forEach((opt, idx) => {
          md += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
        });
        md += `\n`;
      }
      md += `**答案**: ${q.answer}\n\n`;
      if (q.explanation) {
        md += `**解釋**: ${q.explanation}\n\n`;
      }
      md += `---\n\n`;
    });
  }

  return md;
}

/**
 * 匯出分析結果為PDF
 */
export async function exportAnalysisToPDF(
  result: AnalysisResult,
  fileNames: string[]
): Promise<string> {
  const tmpDir = "/tmp/analysis-export";
  await fs.mkdir(tmpDir, { recursive: true });

  const timestamp = Date.now();
  const mdPath = path.join(tmpDir, `analysis-${timestamp}.md`);
  const pdfPath = path.join(tmpDir, `analysis-${timestamp}.pdf`);

  // 生成Markdown文件
  const markdown = analysisToMarkdown(result, fileNames);
  await fs.writeFile(mdPath, markdown, "utf-8");

  // 使用manus-md-to-pdf工具轉換為PDF
  try {
    await execAsync(`manus-md-to-pdf "${mdPath}" "${pdfPath}"`);
    return pdfPath;
  } catch (error) {
    console.error("PDF export failed:", error);
    throw new Error("PDF匯出失敗");
  }
}

/**
 * 匯出分析結果為Word (使用Markdown作為中間格式)
 */
export async function exportAnalysisToWord(
  result: AnalysisResult,
  fileNames: string[]
): Promise<string> {
  const tmpDir = "/tmp/analysis-export";
  await fs.mkdir(tmpDir, { recursive: true });

  const timestamp = Date.now();
  const mdPath = path.join(tmpDir, `analysis-${timestamp}.md`);
  const docxPath = path.join(tmpDir, `analysis-${timestamp}.docx`);

  // 生成Markdown文件
  const markdown = analysisToMarkdown(result, fileNames);
  await fs.writeFile(mdPath, markdown, "utf-8");

  // 使用pandoc轉換為Word (如果可用)
  try {
    await execAsync(`pandoc "${mdPath}" -o "${docxPath}"`);
    return docxPath;
  } catch (error) {
    // 如果pandoc不可用，返回Markdown文件路徑
    console.warn("Pandoc not available, returning markdown file");
    // 重命名為.md以便下載
    const mdDownloadPath = path.join(tmpDir, `analysis-${timestamp}-report.md`);
    await fs.rename(mdPath, mdDownloadPath);
    return mdDownloadPath;
  }
}

