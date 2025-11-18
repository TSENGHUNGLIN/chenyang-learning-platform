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
import { BookOpen, Plus, Pencil, Trash2, Search, Filter, Home, Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

type QuestionType = "true_false" | "multiple_choice" | "short_answer";
type Difficulty = "easy" | "medium" | "hard";

export default function QuestionBank() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: "true_false" as QuestionType,
    difficulty: "medium" as Difficulty,
    question: "",
    options: "",
    correctAnswer: "",
    explanation: "",
    categoryId: undefined as number | undefined,
    source: "",
  });
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const { data: questions, refetch: refetchQuestions } = trpc.questions.list.useQuery();
  const { data: categories } = trpc.questionCategories.list.useQuery();
  const { data: tags } = trpc.tags.list.useQuery();
  
  const createMutation = trpc.questions.create.useMutation();
  const updateMutation = trpc.questions.update.useMutation();
  const deleteMutation = trpc.questions.delete.useMutation();
  const setTagsMutation = trpc.questionTags.setTags.useMutation();
  const batchImportMutation = trpc.questions.batchImport.useMutation();

  const filteredQuestions = questions
    ?.filter((q: any) => {
      if (searchKeyword && !q.question.toLowerCase().includes(searchKeyword.toLowerCase())) {
        return false;
      }
      if (filterType !== "all" && q.type !== filterType) {
        return false;
      }
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) {
        return false;
      }
      if (filterSource !== "all" && q.source !== filterSource) {
        return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      // 按考題出處排序，相同出處的題目排列在一起
      const sourceA = a.source || "未設定";
      const sourceB = b.source || "未設定";
      if (sourceA < sourceB) return -1;
      if (sourceA > sourceB) return 1;
      // 相同出處內按ID排序
      return a.id - b.id;
    });

  // 處理檔案選擇
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error("僅支援 CSV 格式");
        return;
      }
      setImportFile(file);
    }
  };

  // 處理批次匯入
  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);

    try {
      // 讀取 CSV 檔案
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("檔案內容為空或格式不正確");
        setIsImporting(false);
        return;
      }

      // 解析 CSV
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const questions = [];

      for (let i = 1; i < lines.length; i++) {
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        // 處理含有逗號的欄位
        for (let char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim().replace(/^"|"$/g, ''));

        // 建立題目物件
        const question: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header) {
            case '題型':
              question.type = value;
              break;
            case '難度':
              question.difficulty = value;
              break;
            case '題目':
              question.question = value;
              break;
            case '選項':
              question.options = value;
              break;
            case '正確答案':
              question.correctAnswer = value;
              break;
            case '解釋說明':
              question.explanation = value;
              break;
            case '分類ID':
              if (value) question.categoryId = parseInt(value);
              break;
            case '標籤ID':
              if (value) {
                question.tagIds = value.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
              }
              break;
          }
        });

        // 驗證必填欄位
        if (!question.type || !question.difficulty || !question.question || !question.correctAnswer) {
          continue;
        }

        questions.push(question);
      }

      if (questions.length === 0) {
        toast.error("沒有有效的題目資料");
        setIsImporting(false);
        return;
      }

      // 呼叫 API 批次匯入
      const result = await batchImportMutation.mutateAsync(questions);
      
      // 顯示結果
      if (result.success > 0) {
        toast.success(`成功匯入 ${result.success} 個題目`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} 個題目匯入失敗`);
        if (result.errors.length > 0) {
          console.error("匯入錯誤：", result.errors);
        }
      }

      // 關閉對話框並重新載入
      setShowImportDialog(false);
      setImportFile(null);
      refetchQuestions();
    } catch (error) {
      console.error("匯入錯誤：", error);
      toast.error("匯入失敗，請檢查檔案格式");
    } finally {
      setIsImporting(false);
    }
  };

  // 下載範本檔案
  const downloadTemplate = () => {
    const template = [
      {
        "題型": "true_false",
        "難度": "medium",
        "題目": "設計師在進行品牌設計時，應該優先考慮客戶的需求而非個人風格偏好",
        "選項": "",
        "正確答案": "是",
        "解釋說明": "品牌設計的核心在於滿足客戶需求和目標受眾的期望",
        "分類ID": "",
        "標籤ID": ""
      },
      {
        "題型": "multiple_choice",
        "難度": "easy",
        "題目": "以下哪一個不是設計原則？",
        "選項": '[{"label":"A","value":"對齊"},{"label":"B","value":"對比"},{"label":"C","value":"重複"},{"label":"D","value":"隨意"}]',
        "正確答案": "D",
        "解釋說明": "設計原則包括對齊、對比、重複等，但不包括隨意",
        "分類ID": "",
        "標籤ID": "1,2"
      },
      {
        "題型": "short_answer",
        "難度": "hard",
        "題目": "請說明什麼是响應式設計？",
        "選項": "",
        "正確答案": "响應式設計是一種網頁設計方法，可以讓網站在不同裝置上都能呈現良好的顯示效果",
        "解釋說明": "响應式設計使用彈性版面、媒體查詢等技術",
        "分類ID": "",
        "標籤ID": ""
      }
    ];

    // 建立 CSV 內容
    const headers = Object.keys(template[0]);
    const csvContent = [
      headers.join(","),
      ...template.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // 如果包含逗號或換行，用雙引號包裹
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      )
    ].join("\n");

    // 下載 CSV
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "題庫匯入範本.csv";
    link.click();
    
    toast.success("範本下載成功");
  };

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
      source: question.source || "",
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

  // 選題相關函數
  const toggleQuestionSelection = (questionId: number) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions?.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions?.map((q: any) => q.id) || []);
    }
  };

  // 匯出考試卷功能
  const exportExamPaper = () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一個題目");
      return;
    }

    const selectedQuestionsData = questions?.filter((q: any) => 
      selectedQuestions.includes(q.id)
    );

    // 按題型分類
    const questionsByType: Record<string, any[]> = {
      true_false: [],
      multiple_choice: [],
      short_answer: []
    };

    selectedQuestionsData?.forEach((q: any) => {
      if (questionsByType[q.type]) {
        questionsByType[q.type].push(q);
      }
    });

    // 生成考試卷內容
    let examContent = `# 考試卷\n\n`;
    examContent += `**總題數**: ${selectedQuestions.length} 題\n\n`;
    examContent += `**考試時間**: _____ 分鐘\n\n`;
    examContent += `**及格分數**: _____ 分\n\n`;
    examContent += `---\n\n`;

    let questionNumber = 1;

    // 是非題
    if (questionsByType.true_false.length > 0) {
      examContent += `## 一、是非題（共 ${questionsByType.true_false.length} 題）\n\n`;
      questionsByType.true_false.forEach((q: any) => {
        examContent += `${questionNumber}. ${q.question}\n\n`;
        examContent += `   ☐ 是   ☐ 非\n\n`;
        questionNumber++;
      });
      examContent += `\n`;
    }

    // 選擇題
    if (questionsByType.multiple_choice.length > 0) {
      examContent += `## 二、選擇題（共 ${questionsByType.multiple_choice.length} 題）\n\n`;
      questionsByType.multiple_choice.forEach((q: any) => {
        examContent += `${questionNumber}. ${q.question}\n\n`;
        try {
          const options = JSON.parse(q.options);
          options.forEach((opt: any) => {
            examContent += `   ☐ ${opt.label}. ${opt.value}\n`;
          });
        } catch (e) {
          examContent += `   （選項格式錯誤）\n`;
        }
        examContent += `\n`;
        questionNumber++;
      });
      examContent += `\n`;
    }

    // 問答題
    if (questionsByType.short_answer.length > 0) {
      examContent += `## 三、問答題（共 ${questionsByType.short_answer.length} 題）\n\n`;
      questionsByType.short_answer.forEach((q: any) => {
        examContent += `${questionNumber}. ${q.question}\n\n`;
        examContent += `   答：_________________________________________________\n\n`;
        examContent += `   _____________________________________________________\n\n`;
        questionNumber++;
      });
    }

    // 下載檔案
    const blob = new Blob([examContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `考試卷_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("考試卷匯出成功！");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            題庫管理
          </h1>
          <p className="text-muted-foreground mt-2">
            管理考核題庫，支援是非題、選擇題、問答題
          </p>
        </div>        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            下載範本
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            批次匯入
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </div>
      </div>

      {/* 篩選與搜尋區域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>題目列表</CardTitle>
              <CardDescription>
                共 {filteredQuestions?.length || 0} 個題目
                {selectedQuestions.length > 0 && (
                  <span className="ml-4 text-primary font-semibold">
                    已選擇 {selectedQuestions.length} 題
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedQuestions.length > 0 && (
                <Button onClick={exportExamPaper} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  匯出考試卷 ({selectedQuestions.length})
                </Button>
              )}
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新增題目
              </Button>
            </div>
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
            <div className="space-y-2">
              <Label>考題出處</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger>
                  <SelectValue placeholder="所有出處" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有出處</SelectItem>
                  {Array.from(new Set(questions?.map((q: any) => q.source).filter(Boolean))).map((source: any) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 題目列表 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input 
                      type="checkbox" 
                      checked={selectedQuestions.length === filteredQuestions?.length && filteredQuestions?.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4"
                    />
                  </TableHead>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[40%]">題目</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>難度</TableHead>
                  <TableHead>考題出處</TableHead>
                  <TableHead>製作者</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      尚無題目，請新增題目
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions?.map((question: any, index: number) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => toggleQuestionSelection(question.id)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
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
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {question.source || "未設定"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {question.creatorName || "未知"}
                        </span>
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
              <Label>考題出處</Label>
              <Input
                placeholder="輸入考題出處（例：員工轉正考核問答）"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
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
              <Label>考題出處</Label>
              <Input
                placeholder="輸入考題出處（例：員工轉正考核問答）"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
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

      {/* 批次匯入對話框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批次匯入題目</DialogTitle>
            <DialogDescription>
              請上傳 CSV 檔案，格式請參考下載的範本檔案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  {importFile ? importFile.name : "點擊選擇檔案或拖放檔案至此"}
                </p>
                <p className="text-xs text-muted-foreground">
                  僅支援 CSV 格式
                </p>
              </label>
            </div>
            {importFile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>檔案名稱：{importFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportFile(null)}
                  >
                    移除
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportFile(null);
            }}>
              取消
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importFile || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  匯入中...
                </>
              ) : (
                "開始匯入"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

