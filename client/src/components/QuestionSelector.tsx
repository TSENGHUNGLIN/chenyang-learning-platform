import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Search, Plus } from "lucide-react";

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
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  // 查詢所有題目
  const { data: allQuestions, isLoading } = trpc.questions.list.useQuery();
  
  // 查詢分類
  const { data: categories } = trpc.questionCategories.list.useQuery();
  
  // 查詢標籤
  const { data: tags } = trpc.tags.list.useQuery();

  // 批次加入題目
  const addQuestionsMutation = trpc.exams.batchAddExamQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(`已成功加入 ${data.count} 道題目`);
      setSelectedQuestions([]);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "加入失敗");
    },
  });

  // 篩選題目
  const filteredQuestions = useMemo(() => {
    if (!allQuestions) return [];

    return allQuestions.filter((q) => {
      // 搜尋過濾
      if (searchQuery && q.content && !q.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (searchQuery && !q.content) {
        return false;
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

      return true;
    });
  }, [allQuestions, searchQuery, selectedType, selectedDifficulty, selectedCategory, selectedTag]);

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

  const totalPoints = selectedQuestions.length; // 每題1分

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>從題庫選擇題目</DialogTitle>
          <DialogDescription>
            選擇要加入考卷的題目，每題預設 1 分
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 篩選區域 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          </div>

          {/* 統計資訊 */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">載入中...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">沒有符合條件的題目</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredQuestions.map((question) => {
                  const difficultyInfo = getDifficultyLabel(question.difficulty);
                  const isSelected = selectedQuestions.includes(question.id);

                  return (
                    <div
                      key={question.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
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
                        </div>
                        <p className="text-sm font-medium">{question.question}</p>
                        {question.options && (() => {
                          try {
                            const opts = JSON.parse(question.options);
                            if (Array.isArray(opts)) {
                              return (
                                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                  {opts.map((opt: string, idx: number) => (
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
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleAddQuestions}
            disabled={selectedQuestions.length === 0 || addQuestionsMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            {addQuestionsMutation.isPending
              ? "加入中..."
              : `加入 ${selectedQuestions.length} 道題目`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

