import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Search, X } from "lucide-react";

interface CreateExamWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ExamFormData {
  title: string;
  description: string;
  timeLimit: number;
  passingScore: number;
  gradingMethod: "auto" | "manual" | "mixed";
  status: "draft" | "published" | "archived";
}

interface SelectedQuestion {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  points: number;
  order: number;
}

export default function CreateExamWizard({
  open,
  onOpenChange,
  onSuccess,
}: CreateExamWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    description: "",
    timeLimit: 60,
    passingScore: 60,
    gradingMethod: "auto",
    status: "draft",
  });
  
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // 查詢所有題目
  const { data: questions, isLoading: questionsLoading } = trpc.questions.list.useQuery();
  
  // 查詢所有分類
  const { data: categories } = trpc.questionCategories.list.useQuery();

  // 建立考試mutation
  const createExamMutation = trpc.exams.create.useMutation({
    onSuccess: async (exam) => {
      // 批次新增題目
      if (selectedQuestions.length > 0) {
        await batchAddQuestionsMutation.mutateAsync({
          examId: exam.id,
          questions: selectedQuestions.map((q) => ({
            questionId: q.id,
            questionOrder: q.order,
            points: q.points,
          })),
        });
      }
      toast.success("考試建立成功");
      resetWizard();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`建立失敗：${error.message}`);
    },
  });

  const batchAddQuestionsMutation = trpc.exams.batchAddQuestions.useMutation();

  const resetWizard = () => {
    setCurrentStep(1);
    setFormData({
      title: "",
      description: "",
      timeLimit: 60,
      passingScore: 60,
      gradingMethod: "auto",
      status: "draft",
    });
    setSelectedQuestions([]);
    setSearchQuery("");
    setFilterType("all");
    setFilterDifficulty("all");
    setFilterCategory("all");
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        toast.error("請輸入考試標題");
        return;
      }
    } else if (currentStep === 2) {
      if (selectedQuestions.length === 0) {
        toast.error("請至少選擇一個題目");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    const totalScore = selectedQuestions.reduce((sum, q) => sum + q.points, 0);
    createExamMutation.mutate({
      ...formData,
      totalScore,
    });
  };

  const toggleQuestion = (question: any) => {
    const isSelected = selectedQuestions.some((q) => q.id === question.id);
    if (isSelected) {
      setSelectedQuestions(selectedQuestions.filter((q) => q.id !== question.id));
    } else {
      setSelectedQuestions([
        ...selectedQuestions,
        {
          id: question.id,
          question: question.question,
          type: question.type,
          difficulty: question.difficulty,
          points: 10, // 預設分數
          order: selectedQuestions.length + 1,
        },
      ]);
    }
  };

  const updateQuestionPoints = (id: number, points: number) => {
    setSelectedQuestions(
      selectedQuestions.map((q) => (q.id === id ? { ...q, points } : q))
    );
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...selectedQuestions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    
    // 更新順序
    newQuestions.forEach((q, i) => {
      q.order = i + 1;
    });
    
    setSelectedQuestions(newQuestions);
  };

  // 篩選題目
  const filteredQuestions = questions?.filter((q) => {
    if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== "all" && q.type !== filterType) {
      return false;
    }
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) {
      return false;
    }
    if (filterCategory !== "all" && q.categoryId?.toString() !== filterCategory) {
      return false;
    }
    return true;
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      true_false: "是非題",
      multiple_choice: "選擇題",
      short_answer: "問答題",
    };
    return labels[type] || type;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      easy: "簡單",
      medium: "中等",
      hard: "困難",
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };
    return colors[difficulty] || "bg-gray-100 text-gray-800";
  };

  const totalScore = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>建立考試</DialogTitle>
          <DialogDescription>
            步驟 {currentStep} / 4
          </DialogDescription>
        </DialogHeader>

        {/* 步驟指示器 */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step < currentStep
                    ? "bg-green-500 text-white"
                    : step === currentStep
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 步驟1：基本資訊 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">考試標題 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="例如：新人培訓考試"
              />
            </div>
            <div>
              <Label htmlFor="description">考試說明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="輸入考試的詳細說明..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeLimit">時間限制（分鐘）</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timeLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="passingScore">及格分數</Label>
                <Input
                  id="passingScore"
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passingScore: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="gradingMethod">評分方式</Label>
              <Select
                value={formData.gradingMethod}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, gradingMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自動評分</SelectItem>
                  <SelectItem value="manual">人工評分</SelectItem>
                  <SelectItem value="mixed">混合評分</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">考試狀態</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="published">已發布</SelectItem>
                  <SelectItem value="archived">已封存</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 步驟2：選擇題目 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* 搜尋和篩選 */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜尋題目..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="題型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有題型</SelectItem>
                    <SelectItem value="true_false">是非題</SelectItem>
                    <SelectItem value="multiple_choice">選擇題</SelectItem>
                    <SelectItem value="short_answer">問答題</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="難度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有難度</SelectItem>
                    <SelectItem value="easy">簡單</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困難</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="分類" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有分類</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 已選題目統計 */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                已選擇 <span className="font-bold">{selectedQuestions.length}</span> 個題目
              </p>
            </div>

            {/* 題目列表 */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {questionsLoading ? (
                <p className="text-center text-gray-500">載入中...</p>
              ) : filteredQuestions && filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => {
                  const isSelected = selectedQuestions.some((q) => q.id === question.id);
                  return (
                    <Card
                      key={question.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleQuestion(question)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={isSelected} className="mt-1" />
                          <div className="flex-1">
                            <p className="font-medium mb-2">{question.question}</p>
                            <div className="flex gap-2">
                              <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {getDifficultyLabel(question.difficulty)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-center text-gray-500">沒有符合條件的題目</p>
              )}
            </div>
          </div>
        )}

        {/* 步驟3：設定分數 */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                總分：<span className="font-bold">{totalScore}</span> 分
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {selectedQuestions.map((question, index) => (
                <Card key={question.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveQuestion(index, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveQuestion(index, "down")}
                          disabled={index === selectedQuestions.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">第 {question.order} 題</Badge>
                          <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                          <Badge className={getDifficultyColor(question.difficulty)}>
                            {getDifficultyLabel(question.difficulty)}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{question.question}</p>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`points-${question.id}`} className="text-sm">
                            分數：
                          </Label>
                          <Input
                            id={`points-${question.id}`}
                            type="number"
                            value={question.points}
                            onChange={(e) =>
                              updateQuestionPoints(
                                question.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            min={0}
                            className="w-20"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedQuestions(
                            selectedQuestions.filter((q) => q.id !== question.id)
                          )
                        }
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 步驟4：預覽 */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label className="text-gray-600">考試標題</Label>
                  <p className="font-medium">{formData.title}</p>
                </div>
                {formData.description && (
                  <div>
                    <Label className="text-gray-600">考試說明</Label>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">時間限制</Label>
                    <p className="font-medium">{formData.timeLimit} 分鐘</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">及格分數</Label>
                    <p className="font-medium">{formData.passingScore} 分</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">總分</Label>
                    <p className="font-medium">{totalScore} 分</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">題目數量</Label>
                    <p className="font-medium">{selectedQuestions.length} 題</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">評分方式</Label>
                    <p className="font-medium">
                      {formData.gradingMethod === "auto"
                        ? "自動評分"
                        : formData.gradingMethod === "manual"
                        ? "人工評分"
                        : "混合評分"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">狀態</Label>
                    <p className="font-medium">
                      {formData.status === "draft"
                        ? "草稿"
                        : formData.status === "published"
                        ? "已發布"
                        : "已封存"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label className="text-gray-600 mb-2 block">題目列表</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedQuestions.map((question) => (
                  <Card key={question.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">第 {question.order} 題</Badge>
                            <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {getDifficultyLabel(question.difficulty)}
                            </Badge>
                          </div>
                          <p className="text-sm">{question.question}</p>
                        </div>
                        <Badge className="ml-3">{question.points} 分</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 按鈕區 */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一步
          </Button>
          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              下一步
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createExamMutation.isPending}
            >
              {createExamMutation.isPending ? "建立中..." : "建立考試"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

