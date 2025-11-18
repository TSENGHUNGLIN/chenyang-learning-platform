import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ParsedQuestion {
  type: "true_false" | "multiple_choice" | "short_answer";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options?: string;
  correctAnswer: string;
  explanation?: string;
  categoryId?: number;
  tagIds?: number[];
}

interface ImportQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ParsedQuestion[];
  onImportSuccess?: () => void;
}

export default function ImportQuestionsDialog({
  open,
  onOpenChange,
  questions,
  onImportSuccess,
}: ImportQuestionsDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [isImporting, setIsImporting] = useState(false);

  const { data: categories } = trpc.questionCategories.list.useQuery();
  const batchImportMutation = trpc.questions.batchImport.useMutation();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "true_false":
        return "是非題";
      case "multiple_choice":
        return "選擇題";
      case "short_answer":
        return "問答題";
      default:
        return type;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "簡單";
      case "medium":
        return "中等";
      case "hard":
        return "困難";
      default:
        return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      // 為所有題目設定分類
      const questionsWithCategory = questions.map(q => ({
        ...q,
        categoryId: selectedCategory,
      }));

      const result = await batchImportMutation.mutateAsync(questionsWithCategory);

      if (result.success > 0) {
        toast.success(`成功匯入 ${result.success} 個題目${result.failed > 0 ? `，${result.failed} 個失敗` : ""}`);
        
        if (result.errors.length > 0) {
          console.error("匯入錯誤:", result.errors);
        }
        
        onOpenChange(false);
        onImportSuccess?.();
      } else {
        toast.error("匯入失敗");
        if (result.errors.length > 0) {
          console.error("匯入錯誤:", result.errors);
        }
      }
    } catch (error) {
      console.error("匯入題目失敗:", error);
      toast.error("匯入題目失敗");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>匯入題目到題庫</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                共解析到 <span className="font-semibold text-foreground">{questions.length}</span> 個題目
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="category" className="text-sm">
                選擇分類：
              </Label>
              <Select
                value={selectedCategory?.toString()}
                onValueChange={(value) => setSelectedCategory(Number(value))}
              >
                <SelectTrigger id="category" className="w-[200px]">
                  <SelectValue placeholder="選擇分類（選填）" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-md p-4">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">#{index + 1}</span>
                      <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {getDifficultyLabel(question.difficulty)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{question.question}</p>
                    
                    {question.options && (
                      <div className="text-xs text-muted-foreground pl-4">
                        {Object.entries(JSON.parse(question.options)).map(([key, value]) => (
                          <div key={key}>
                            {key}. {value as string}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">答案：</span>
                      <span className="font-medium text-green-600">{question.correctAnswer}</span>
                    </div>
                    
                    {question.explanation && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">解釋：</span>
                        {question.explanation.substring(0, 100)}
                        {question.explanation.length > 100 && "..."}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                匯入中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                確認匯入
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

