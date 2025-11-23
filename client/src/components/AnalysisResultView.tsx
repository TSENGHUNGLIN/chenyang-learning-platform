import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, TrendingUp, BookOpen, FileQuestion } from "lucide-react";

interface AnalysisResult {
  summary: string;
  difficulty: {
    level: "簡單" | "中等" | "困難";
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
    importance: "high" | "medium" | "low";
    recommendation: string;
  }>;
  recommendedQuestions: Array<{
    title: string;
    reason: string;
    difficulty: "簡單" | "中等" | "困難";
  }>;
  questionsOnly?: Array<{
    number: number;
    question: string;
    type: "是非題" | "單選題" | "複選題" | "問答題";
    options?: string[];
    source?: string;
    suggestedCategory?: string;
    suggestedTags?: string[];
  }>;
  questionsWithAnswers?: Array<{
    number: number;
    question: string;
    type: "是非題" | "單選題" | "複選題" | "問答題";
    options?: string[];
    answer: string;
    explanation?: string;
    source?: string;
    suggestedCategory?: string;
    suggestedTags?: string[];
  }>;
}

interface AnalysisResultViewProps {
  result: AnalysisResult;
}

const getDifficultyColor = (level: string) => {
  switch (level) {
    case "簡單":
      return "bg-green-100 text-green-800 border-green-200";
    case "中等":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "困難":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getImportanceColor = (importance: string) => {
  switch (importance) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getImportanceLabel = (importance: string) => {
  switch (importance) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return importance;
  }
};

export default function AnalysisResultView({ result }: AnalysisResultViewProps) {
  return (
    <div className="space-y-6">
      {/* 整體摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            整體摘要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* 難度評估 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            難度評估
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge className={getDifficultyColor(result.difficulty.level)} variant="outline">
              {result.difficulty.level}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{result.difficulty.score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{result.difficulty.reasoning}</p>
        </CardContent>
      </Card>

      {/* 答題表現分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            答題表現分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 優勢 */}
          <div>
            <h4 className="font-medium text-sm mb-2 text-green-700">✓ 優勢</h4>
            <ul className="space-y-1">
              {result.performance.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 弱點 */}
          <div>
            <h4 className="font-medium text-sm mb-2 text-red-700">✗ 弱點</h4>
            <ul className="space-y-1">
              {result.performance.weaknesses.map((weakness, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 改進建議 */}
          <div>
            <h4 className="font-medium text-sm mb-2 text-blue-700">💡 改進建議</h4>
            <ul className="space-y-1">
              {result.performance.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 需要加強的知識點 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            需要加強的知識點
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.knowledgeGaps.map((gap, index) => (
              <div key={index} className="border-l-4 border-orange-400 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{gap.topic}</h4>
                  <Badge className={getImportanceColor(gap.importance)} variant="outline">
                    重要性：{getImportanceLabel(gap.importance)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{gap.recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 推薦考題 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            推薦相關考題
          </CardTitle>
          <CardDescription>根據目前表現，建議練習以下考題</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.recommendedQuestions.map((question, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-medium text-sm">{question.title}</h4>
                  <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                    {question.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{question.reason}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 題目整理（不含答案） */}
      {result.questionsOnly && result.questionsOnly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              題目整理
            </CardTitle>
            <CardDescription>以下是根據檔案內容生成的考題，不含答案</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.questionsOnly.map((q, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg text-primary">{q.number}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline"
                          className={
                            q.type === "複選題" 
                              ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200" 
                              : ""
                          }
                        >
                          {q.type}
                        </Badge>
                        {q.type === "複選題" && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            • 可複選
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-2">{q.question}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="space-y-1 ml-4">
                          {q.options.map((option, optIdx) => (
                            <li key={optIdx} className="text-sm text-muted-foreground">
                              {String.fromCharCode(65 + optIdx)}. {option}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 題目與答案 */}
      {result.questionsWithAnswers && result.questionsWithAnswers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              題目與答案
            </CardTitle>
            <CardDescription>完整的考題和答案解析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {result.questionsWithAnswers.map((q, index) => (
                <div key={index} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg text-primary">{q.number}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline"
                          className={
                            q.type === "複選題" 
                              ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200" 
                              : ""
                          }
                        >
                          {q.type}
                        </Badge>
                        {q.type === "複選題" && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            • 可複選
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-2 font-medium">{q.question}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="space-y-1 ml-4 mb-3">
                          {q.options.map((option, optIdx) => (
                            <li key={optIdx} className="text-sm text-muted-foreground">
                              {String.fromCharCode(65 + optIdx)}. {option}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-sm font-semibold text-green-700">答案：</span>
                          <span className="text-sm font-medium text-green-700">{q.answer}</span>
                        </div>
                        {q.explanation && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-blue-700">解釋：</span>
                            <span className="text-sm text-muted-foreground">{q.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

