import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, X, Plus } from "lucide-react";

interface QuestionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number;
  onSuccess: () => void;
}

export default function QuestionSelector({
  open,
  onOpenChange,
  examId,
  onSuccess,
}: QuestionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  // 查詢所有題目
  const { data: allQuestions, isLoading } = trpc.questions.list.useQuery();
  
  // 查詢分類
  const { data: categories } = trpc.questionCategories.list.useQuery();
  
  // 查詢標籤
  const { data: tags } = trpc.tags.list.useQuery();

  // 加入題目到考試
  const addQuestionsMutation = trpc.exams.addQuestions.useMutation({
    onSuccess: () => {
      toast.success(`成功加入 ${selectedQuestions.length} 道題目`);
      setSelectedQuestions([]);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`加入題目失敗：${error.message}`);
    },
  });

  // 篩選題目
  const filteredQuestions = useMemo(() => {
    if (!allQuestions) return [];

    return allQuestions.filter((q) => {
      // 搜尋過濾（智慧匹配）
      if (searchQuery) {
        if (!q.question) return false;
        
        const query = searchQuery.toLowerCase().trim();
        const content = q.question.toLowerCase();
        
        // 支援多個關鍵字（空格分隔）
        const keywords = query.split(/\s+/).filter(k => k.length > 0);
        
        // 所有關鍵字都必須匹配
        const allMatch = keywords.every(keyword => {
          // 直接包含匹配
          if (content.includes(keyword)) return true;
          
          // 部分字元匹配（支援中文部分匹配）
          // 例如：搜尋「晨陽」可以找到「晨陽建設」
          if (keyword.length >= 2) {
            for (let i = 0; i < content.length - keyword.length + 1; i++) {
              if (content.substring(i, i + keyword.length) === keyword) {
                return true;
              }
            }
          }
          
          return false;
        });
        
        if (!allMatch) return false;
      }

      // 題型過濾
      if (selectedType !== "all" && q.type !== selectedType) {
        return false;
      }

      // 難度過濾
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) {
        return false;
      }

      // 分類過濾
      if (selectedCategory !== "all" && q.categoryId?.toString() !== selectedCategory) {
        return false;
      }

      // 標籤過濾
      if (selectedTag !== "all") {
        const questionTags = q.tags || [];
        const hasTag = questionTags.some((tag: any) => tag.id.toString() === selectedTag);
        if (!hasTag) {
          return false;
        }
      }

      // 考題出處過濾
      if (selectedSource !== "all" && q.source !== selectedSource) {
        return false;
      }

      return true;
    });
  }, [allQuestions, searchQuery, selectedType, selectedDifficulty, selectedCategory, selectedTag, selectedSource]);

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleToggleAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map((q) => q.id));
    }
  };

  const handleAddQuestions = () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一道題目");
      return;
    }

    addQuestionsMutation.mutate({
      examId,
      questionIds: selectedQuestions,
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trueFalse: "是非題",
      multipleChoice: "選擇題",
      shortAnswer: "問答題",
    };
    return labels[type] || type;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
      easy: { text: "簡單", variant: "secondary" },
      medium: { text: "中等", variant: "default" },
      hard: { text: "困難", variant: "destructive" },
    };
    return labels[difficulty] || { text: difficulty, variant: "secondary" };
  };

  // 關鍵字高亮顯示
  const highlightKeywords = (text: string) => {
    if (!searchQuery || !text) return text;

    const query = searchQuery.toLowerCase().trim();
    const keywords = query.split(/\s+/).filter(k => k.length > 0);
    
    if (keywords.length === 0) return text;

    // 將所有關鍵字的位置找出來
    const matches: Array<{ start: number; end: number; keyword: string }> = [];
    
    keywords.forEach(keyword => {
      const lowerText = text.toLowerCase();
      let index = 0;
      
      while (index < lowerText.length) {
        const foundIndex = lowerText.indexOf(keyword, index);
        if (foundIndex === -1) break;
        
        matches.push({
          start: foundIndex,
          end: foundIndex + keyword.length,
          keyword
        });
        
        index = foundIndex + 1;
      }
    });

    if (matches.length === 0) return text;

    // 按起始位置排序
    matches.sort((a, b) => a.start - b.start);

    // 合併重疊的匹配
    const mergedMatches: Array<{ start: number; end: number }> = [];
    let current = matches[0];
    
    for (let i = 1; i < matches.length; i++) {
      if (matches[i].start <= current.end) {
        current.end = Math.max(current.end, matches[i].end);
      } else {
        mergedMatches.push(current);
        current = matches[i];
      }
    }
    mergedMatches.push(current);

    // 建立高亮文字
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    mergedMatches.forEach((match, i) => {
      // 加入未高亮的部分
      if (match.start > lastIndex) {
        parts.push(text.substring(lastIndex, match.start));
      }
      
      // 加入高亮的部分
      parts.push(
        <mark key={i} className="bg-yellow-200 text-foreground px-0.5 rounded">
          {text.substring(match.start, match.end)}
        </mark>
      );
      
      lastIndex = match.end;
    });

    // 加入最後的未高亮部分
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  const totalPoints = selectedQuestions.length; // 每題1分

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* 頂部標題欄 */}
      <div className="border-b bg-background">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h2 className="text-2xl font-bold">從題庫選擇題目</h2>
            <p className="text-sm text-muted-foreground mt-1">
              選擇要加入考卷的題目，每題預設 1 分
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAddQuestions}
              disabled={selectedQuestions.length === 0 || addQuestionsMutation.isPending}
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              加入 {selectedQuestions.length} 道題目
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="container py-6 h-[calc(100vh-88px)] overflow-auto">
        <div className="space-y-6">
          {/* 篩選區域 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">搜尋題目</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="關鍵字..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">題型</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="全部題型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部題型</SelectItem>
                  <SelectItem value="trueFalse">是非題</SelectItem>
                  <SelectItem value="multipleChoice">選擇題</SelectItem>
                  <SelectItem value="shortAnswer">問答題</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">難度</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="全部難度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部難度</SelectItem>
                  <SelectItem value="easy">簡單</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困難</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分類</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="全部分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分類</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag">標籤</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger id="tag">
                  <SelectValue placeholder="全部標籤" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部標籤</SelectItem>
                  {tags?.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">考題出處</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="全部出處" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部出處</SelectItem>
                  {Array.from(new Set(allQuestions?.map(q => q.source).filter(Boolean))).sort().map((source) => (
                    <SelectItem key={source} value={source as string}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 統計資訊 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                onCheckedChange={handleToggleAll}
              />
              <span className="text-sm font-medium">
                已選擇 {selectedQuestions.length} 道題目
              </span>
              <span className="text-sm text-muted-foreground">
                共 {filteredQuestions.length} 道可選題目
              </span>
            </div>
            <div className="text-sm font-medium">
              預計總分：{totalPoints} 分
            </div>
          </div>

          {/* 題目列表 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">載入中...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">沒有符合條件的題目</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((question) => {
                const difficultyInfo = getDifficultyLabel(question.difficulty);
                const isSelected = selectedQuestions.includes(question.id);

                return (
                  <div
                    key={question.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => handleToggleQuestion(question.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        // 阻止事件冒泡，避免重複觸發
                        handleToggleQuestion(question.id);
                      }}
                      onClick={(e) => {
                        // 阻止事件冒泡
                        e.stopPropagation();
                      }}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getQuestionTypeLabel(question.type)}
                        </Badge>
                        <Badge variant={difficultyInfo.variant}>
                          {difficultyInfo.text}
                        </Badge>
                        {question.category && (
                          <Badge variant="secondary">{question.category.name}</Badge>
                        )}
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex gap-1">
                            {question.tags.map((tag: any) => (
                              <Badge key={tag.id} variant="outline" className="text-xs">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-sm">{highlightKeywords(question.question)}</div>
                      {(() => {
                        try {
                          if (question.type === "multipleChoice" && question.options) {
                            const options = JSON.parse(question.options);
                            return (
                              <div className="text-sm text-muted-foreground space-y-1 pl-4">
                                {options.map((opt: string, idx: number) => (
                                  <div key={idx}>
                                    {String.fromCharCode(65 + idx)}. {opt}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        } catch (e) {
                          // 如果解析失敗，不顯示選項
                        }
                        return null;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">1 分</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

