import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { toast } from "sonner";

type QuestionType = "true_false" | "multiple_choice" | "short_answer";
type Difficulty = "easy" | "medium" | "hard";

export default function QuestionBank() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    type: "true_false" as QuestionType,
    difficulty: "medium" as Difficulty,
    question: "",
    options: "",
    correctAnswer: "",
    explanation: "",
    categoryId: undefined as number | undefined,
  });
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const { data: questions, refetch: refetchQuestions } = trpc.questions.list.useQuery();
  const { data: categories } = trpc.questionCategories.list.useQuery();
  const { data: tags } = trpc.tags.list.useQuery();
  
  const createMutation = trpc.questions.create.useMutation();
  const updateMutation = trpc.questions.update.useMutation();
  const deleteMutation = trpc.questions.delete.useMutation();
  const setTagsMutation = trpc.questionTags.setTags.useMutation();

  const filteredQuestions = questions?.filter((q: any) => {
    if (searchKeyword && !q.question.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    if (filterType !== "all" && q.type !== filterType) {
      return false;
    }
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) {
      return false;
    }
    return true;
  });

  const resetForm = () => {
    setFormData({
      type: "true_false",
      difficulty: "medium",
      question: "",
      options: "",
      correctAnswer: "",
      explanation: "",
      categoryId: undefined,
    });
    setSelectedTags([]);
  };

  const handleCreate = async () => {
    if (!formData.question.trim()) {
      toast.error("請輸入題目");
      return;
    }
    if (!formData.correctAnswer.trim()) {
      toast.error("請輸入正確答案");
      return;
    }

    try {
      const result = await createMutation.mutateAsync(formData);
      // Set tags for the new question
      if (selectedTags.length > 0 && result) {
        const insertResult = result as any;
        const questionId = insertResult.insertId || insertResult[0]?.insertId;
        if (questionId) {
          await setTagsMutation.mutateAsync({ questionId, tagIds: selectedTags });
        }
      }
      toast.success("題目新增成功");
      setShowCreateDialog(false);
      resetForm();
      refetchQuestions();
    } catch (error) {
      toast.error("新增失敗");
    }
  };

  const handleEdit = async () => {
    if (!editingQuestion) return;

    try {
      await updateMutation.mutateAsync({
        id: editingQuestion.id,
        ...formData,
      });
      // Update tags
      await setTagsMutation.mutateAsync({ 
        questionId: editingQuestion.id, 
        tagIds: selectedTags 
      });
      toast.success("題目更新成功");
      setShowEditDialog(false);
      setEditingQuestion(null);
      resetForm();
      refetchQuestions();
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這個題目嗎？")) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("題目刪除成功");
      refetchQuestions();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const openEditDialog = (question: any) => {
    setEditingQuestion(question);
    setFormData({
      type: question.type,
      difficulty: question.difficulty,
      question: question.question,
      options: question.options || "",
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      categoryId: question.categoryId,
    });
    // Tags will be loaded in the dialog via useEffect
    setShowEditDialog(true);
  };

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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          題庫管理
        </h1>
        <p className="text-muted-foreground mt-2">
          管理考核題庫，支援是非題、選擇題、問答題
        </p>
      </div>

      {/* 篩選與搜尋區域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>題目列表</CardTitle>
              <CardDescription>共 {filteredQuestions?.length || 0} 個題目</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增題目
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label>搜尋題目</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="輸入關鍵字..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>題目類型</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="所有類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有類型</SelectItem>
                  <SelectItem value="true_false">是非題</SelectItem>
                  <SelectItem value="multiple_choice">選擇題</SelectItem>
                  <SelectItem value="short_answer">問答題</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>難度</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="所有難度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有難度</SelectItem>
                  <SelectItem value="easy">簡單</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困難</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 題目列表 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">題目</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>難度</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      尚無題目，請新增題目
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions?.map((question: any) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        <div className="line-clamp-2">{question.question}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(question.difficulty)}>
                          {getDifficultyLabel(question.difficulty)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(question)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(question.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 新增題目對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增題目</DialogTitle>
            <DialogDescription>填寫題目資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>題目類型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as QuestionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true_false">是非題</SelectItem>
                    <SelectItem value="multiple_choice">選擇題</SelectItem>
                    <SelectItem value="short_answer">問答題</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>難度</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value as Difficulty })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">簡單</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困難</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>題目</Label>
              <Textarea
                placeholder="輸入題目內容..."
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={4}
              />
            </div>
            {formData.type === "multiple_choice" && (
              <div className="space-y-2">
                <Label>選項（JSON格式）</Label>
                <Textarea
                  placeholder='例如：["選項A", "選項B", "選項C", "選項D"]'
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  rows={3}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>正確答案</Label>
              <Input
                placeholder="輸入正確答案..."
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>解釋說明（選填）</Label>
              <Textarea
                placeholder="輸入答案解釋..."
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>標籤（選填）</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                {tags && tags.length > 0 ? (
                  tags.map((tag: any) => (
                    <Badge
                      key={tag.id}
                      style={{ 
                        backgroundColor: selectedTags.includes(tag.id) ? (tag.color || "#3b82f6") : "#e5e7eb",
                        color: selectedTags.includes(tag.id) ? "white" : "#6b7280",
                        cursor: "pointer"
                      }}
                      onClick={() => {
                        if (selectedTags.includes(tag.id)) {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        } else {
                          setSelectedTags([...selectedTags, tag.id]);
                        }
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">尚無標籤，請先到標籤管理新增標籤</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯題目對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯題目</DialogTitle>
            <DialogDescription>修改題目資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>題目類型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as QuestionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true_false">是非題</SelectItem>
                    <SelectItem value="multiple_choice">選擇題</SelectItem>
                    <SelectItem value="short_answer">問答題</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>難度</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value as Difficulty })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">簡單</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困難</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>題目</Label>
              <Textarea
                placeholder="輸入題目內容..."
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={4}
              />
            </div>
            {formData.type === "multiple_choice" && (
              <div className="space-y-2">
                <Label>選項（JSON格式）</Label>
                <Textarea
                  placeholder='例如：["選項A", "選項B", "選項C", "選項D"]'
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  rows={3}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>正確答案</Label>
              <Input
                placeholder="輸入正確答案..."
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>解釋說明（選填）</Label>
              <Textarea
                placeholder="輸入答案解釋..."
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>標籤（選填）</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                {tags && tags.length > 0 ? (
                  tags.map((tag: any) => (
                    <Badge
                      key={tag.id}
                      style={{ 
                        backgroundColor: selectedTags.includes(tag.id) ? (tag.color || "#3b82f6") : "#e5e7eb",
                        color: selectedTags.includes(tag.id) ? "white" : "#6b7280",
                        cursor: "pointer"
                      }}
                      onClick={() => {
                        if (selectedTags.includes(tag.id)) {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        } else {
                          setSelectedTags([...selectedTags, tag.id]);
                        }
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">尚無標籤，請先到標籤管理新增標籤</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

