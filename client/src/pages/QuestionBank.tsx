import { useState, useEffect } from "react";
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
import { BookOpen, Plus, Pencil, Trash2, Search, Filter, Home, Download, Upload, Loader2, ClipboardList, AlertTriangle, Sparkles, Check, Eye } from "lucide-react";
import QuestionPreviewDialog from "@/components/QuestionPreviewDialog";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type QuestionType = "true_false" | "multiple_choice" | "multiple_answer" | "short_answer";
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
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewQuestionId, setPreviewQuestionId] = useState<number>(0);
  
  // 搜尋關鍵字高亮顯示函數
  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [showExportConfirmDialog, setShowExportConfirmDialog] = useState(false);
  const [exportAction, setExportAction] = useState<'download' | 'create_exam'>('download');
  const [showCreateExamDialog, setShowCreateExamDialog] = useState(false);
  const [examFormData, setExamFormData] = useState({
    title: '',
    timeLimit: 60,
    passingScore: 60,
  });
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(15);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { user } = useAuth();

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
  const applyAiSuggestionsMutation = trpc.questions.applyAiSuggestions.useMutation();

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

    // 驗證選項格式（僅選擇題和複選題）
    if ((formData.type === 'multiple_choice' || formData.type === 'multiple_answer') && formData.options) {
      try {
        const parsedOptions = JSON.parse(formData.options);
        
        // 檢查是否為陣列
        if (!Array.isArray(parsedOptions)) {
          toast.error("選項必須為陣列格式，例如：[\"A\", \"B\", \"C\", \"D\"]");
          return;
        }
        
        // 檢查陣列是否為空
        if (parsedOptions.length === 0) {
          toast.error("選項不能為空");
          return;
        }
        
        // 檢查每個選項是否有內容
        const hasEmptyOption = parsedOptions.some((opt: any) => {
          if (typeof opt === 'string') {
            return !opt.trim();
          }
          if (typeof opt === 'object' && opt !== null) {
            return !opt.label || !opt.value;
          }
          return true;
        });
        
        if (hasEmptyOption) {
          toast.error("選項內容不能為空");
          return;
        }
      } catch (error) {
        toast.error("選項格式錯誤，請使用正確的 JSON 陣列格式");
        return;
      }
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

    // 驗證選項格式（僅選擇題和複選題）
    if ((formData.type === 'multiple_choice' || formData.type === 'multiple_answer') && formData.options) {
      try {
        const parsedOptions = JSON.parse(formData.options);
        
        // 檢查是否為陣列
        if (!Array.isArray(parsedOptions)) {
          toast.error("選項必須為陣列格式，例如：[\"A\", \"B\", \"C\", \"D\"]");
          return;
        }
        
        // 檢查陣列是否為空
        if (parsedOptions.length === 0) {
          toast.error("選項不能為空");
          return;
        }
        
        // 檢查每個選項是否有內容
        const hasEmptyOption = parsedOptions.some((opt: any) => {
          if (typeof opt === 'string') {
            return !opt.trim();
          }
          if (typeof opt === 'object' && opt !== null) {
            return !opt.label || !opt.value;
          }
          return true;
        });
        
        if (hasEmptyOption) {
          toast.error("選項內容不能為空");
          return;
        }
      } catch (error) {
        toast.error("選項格式錯誤，請使用正確的 JSON 陣列格式");
        return;
      }
    }

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

  // 開啟刪除確認對話框
  const openDeleteConfirmDialog = () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一個題目");
      return;
    }

    // 檢查權限
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      toast.error("您沒有權限刪除題目，只有管理員和編輯者可以刪除");
      return;
    }

    setDeleteCountdown(15);
    setShowDeleteConfirmDialog(true);
  };

  // 倒數計時
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDeleteConfirmDialog && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown(deleteCountdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showDeleteConfirmDialog, deleteCountdown]);

  // 執行批次刪除
  const confirmBatchDelete = async () => {
    setIsDeleting(true);
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const questionId of selectedQuestions) {
        try {
          await deleteMutation.mutateAsync(questionId);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`刪除題目 ${questionId} 失敗:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`成功刪除 ${successCount} 個題目${failCount > 0 ? `，${failCount} 個失敗` : ''}`);
      } else {
        toast.error("批次刪除失敗，請稍後再試");
      }
      
      setSelectedQuestions([]);
      setShowDeleteConfirmDialog(false);
      refetchQuestions();
    } catch (error) {
      toast.error("批次刪除失敗，請稍後再試");
    } finally {
      setIsDeleting(false);
    }
  };

  // 取消刪除
  const cancelBatchDelete = () => {
    setShowDeleteConfirmDialog(false);
    setDeleteCountdown(15);
    toast.info("已取消刪除操作");
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
        return "單選題";
      case "multiple_answer":
        return "複選題";
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

  // 打開匯出確認對話框
  const openExportConfirmDialog = () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一個題目");
      return;
    }
    setShowExportConfirmDialog(true);
  };

  // 匯出考試卷功能
  const exportExamPaper = () => {

    const selectedQuestionsData = questions?.filter((q: any) => 
      selectedQuestions.includes(q.id)
    );

    // 按題型分類
    const questionsByType: Record<string, any[]> = {
      true_false: [],
      multiple_answer: [],
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
    const blob = new Blob([examContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `考試卷_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("考試卷已匯出");
    setShowExportConfirmDialog(false);
  };

  // 建立線上考試
  const handleCreateExam = () => {
    setShowExportConfirmDialog(false);
    setShowCreateExamDialog(true);
  };

  const [, setLocation] = useLocation();
  const createExamMutation = trpc.exams.create.useMutation();
  const batchAddQuestionsMutation = trpc.exams.batchAddExamQuestions.useMutation();

  const confirmCreateExam = async () => {
    if (!examFormData.title.trim()) {
      toast.error("請輸入考試名稱");
      return;
    }

    try {
      // 建立考試
      const exam = await createExamMutation.mutateAsync({
        title: examFormData.title,
        timeLimit: examFormData.timeLimit,
        passingScore: examFormData.passingScore,
      });

      // 批次新增題目
      await batchAddQuestionsMutation.mutateAsync({
        examId: exam.id,
        questionIds: selectedQuestions,
      });

      toast.success("考試建立成功！");
      setShowCreateExamDialog(false);
      
      // 重置表單
      setExamFormData({
        title: '',
        timeLimit: 60,
        passingScore: 60,
      });
      setSelectedQuestions([]);

      // 跳轉到考試管理頁面
      setLocation('/exams');
    } catch (error: any) {
      console.error('建立考試失敗:', error);
      toast.error(error.message || "建立考試失敗，請稍後再試");
    }
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
            管理考核題庫，支援是非題、單選題、複選題、問答題
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
          <Button variant="outline" onClick={() => window.location.href = '/recycle-bin'}>
            <Trash2 className="h-4 w-4 mr-2" />
            回收站
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </div>
      </div>

      {/* 篩選與搜尋區域 */}
      <Card className="mb-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-900 dark:text-purple-100">題目列表</CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
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
                <>
                  <Button 
                    onClick={openDeleteConfirmDialog} 
                    variant="destructive"
                    disabled={!user || (user.role !== 'admin' && user.role !== 'editor')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    批次刪除 ({selectedQuestions.length})
                  </Button>
                  <Button onClick={openExportConfirmDialog} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    匯出考試卷 ({selectedQuestions.length})
                  </Button>
                </>
              )}
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新增題目
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                  <SelectItem value="multiple_choice">單選題</SelectItem>
                  <SelectItem value="multiple_answer">複選題</SelectItem>
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
                      checked={selectedQuestions.length > 0 && selectedQuestions.length === filteredQuestions?.length}
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
                        <div className="flex items-start gap-2">
                          <div className="line-clamp-2 flex-1">{highlightText(question.question, searchKeyword)}</div>
                          {question.isAiGenerated === 1 && (
                            <Badge variant="secondary" className="shrink-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI生成
                            </Badge>
                          )}
                        </div>
                        {question.isAiGenerated === 1 && (question.suggestedCategoryId || question.suggestedTagIds) && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            <span>AI建議：</span>
                            {question.suggestedCategoryId && (
                              <Badge variant="outline" className="text-xs">
                                {categories?.find((c: any) => c.id === question.suggestedCategoryId)?.name || `分類 ID: ${question.suggestedCategoryId}`}
                              </Badge>
                            )}
                            {question.suggestedTagIds && (() => {
                              try {
                                const tagIds = JSON.parse(question.suggestedTagIds);
                                return tagIds.map((tagId: number) => {
                                  const tag = tags?.find((t: any) => t.id === tagId);
                                  return tag ? (
                                    <Badge key={tagId} variant="outline" className="text-xs">
                                      {tag.name}
                                    </Badge>
                                  ) : null;
                                });
                              } catch (e) {
                                return null;
                              }
                            })()}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={async () => {
                                try {
                                  await applyAiSuggestionsMutation.mutateAsync(question.id);
                                  toast.success("已採用AI建議");
                                  refetchQuestions();
                                } catch (error: any) {
                                  toast.error(error.message || "採用失敗");
                                }
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              採用
                            </Button>
                          </div>
                        )}
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
                               <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPreviewQuestionId(question.id);
                              setShowPreviewDialog(true);
                            }}
                            title="預覽題目"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                    <SelectItem value="multiple_choice">單選題</SelectItem>
                    <SelectItem value="multiple_answer">複選題</SelectItem>
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
            {(formData.type === "multiple_choice" || formData.type === "multiple_answer") && (
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
                    <SelectItem value="multiple_choice">單選題</SelectItem>
                    <SelectItem value="multiple_answer">複選題</SelectItem>
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
            {(formData.type === "multiple_choice" || formData.type === "multiple_answer") && (
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

      {/* 匯出考試卷確認對話框 */}
      <Dialog open={showExportConfirmDialog} onOpenChange={setShowExportConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>選擇操作</DialogTitle>
            <DialogDescription>
              請確認以下選擇的題目統計，並選擇要執行的操作
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const selectedQuestionsData = questions?.filter((q: any) => 
                selectedQuestions.includes(q.id)
              );
              const questionsByType: Record<string, number> = {
                true_false: 0,
                multiple_choice: 0,
                short_answer: 0
              };
              selectedQuestionsData?.forEach((q: any) => {
                if (questionsByType[q.type] !== undefined) {
                  questionsByType[q.type]++;
                }
              });
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">總題數</span>
                    <span className="text-lg font-bold">{selectedQuestions.length} 題</span>
                  </div>
                  {questionsByType.true_false > 0 && (
                    <div className="flex justify-between items-center p-2 border rounded">
                      <span>是非題</span>
                      <span className="font-semibold">{questionsByType.true_false} 題</span>
                    </div>
                  )}
                  {questionsByType.multiple_choice > 0 && (
                    <div className="flex justify-between items-center p-2 border rounded">
                      <span>選擇題</span>
                      <span className="font-semibold">{questionsByType.multiple_choice} 題</span>
                    </div>
                  )}
                  {questionsByType.short_answer > 0 && (
                    <div className="flex justify-between items-center p-2 border rounded">
                      <span>問答題</span>
                      <span className="font-semibold">{questionsByType.short_answer} 題</span>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* 選擇操作類型 */}
            <div className="space-y-2">
              <Label>選擇操作</Label>
              <div className="space-y-2">
                <div 
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    exportAction === 'download' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => setExportAction('download')}
                >
                  <input
                    type="radio"
                    name="exportAction"
                    value="download"
                    checked={exportAction === 'download'}
                    onChange={() => setExportAction('download')}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">下載試卷檔案</div>
                    <div className="text-sm text-muted-foreground">匯出為Markdown格式檔案，可用於列印或分享</div>
                  </div>
                </div>
                <div 
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    exportAction === 'create_exam' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => setExportAction('create_exam')}
                >
                  <input
                    type="radio"
                    name="exportAction"
                    value="create_exam"
                    checked={exportAction === 'create_exam'}
                    onChange={() => setExportAction('create_exam')}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">建立線上考試</div>
                    <div className="text-sm text-muted-foreground">使用這些題目建立線上考試，支援自動評分</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportConfirmDialog(false)}>
              取消
            </Button>
            <Button onClick={exportAction === 'download' ? exportExamPaper : handleCreateExam}>
              {exportAction === 'download' ? (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  下載試卷
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  建立考試
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 建立考試對話框 */}
      <Dialog open={showCreateExamDialog} onOpenChange={setShowCreateExamDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>建立線上考試</DialogTitle>
            <DialogDescription>
              請輸入考試的基本資訊
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="examTitle">考試名稱 *</Label>
              <Input
                id="examTitle"
                value={examFormData.title}
                onChange={(e) => setExamFormData({ ...examFormData, title: e.target.value })}
                placeholder="例如：新人培訓考核第一次"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">考試時間限制（分鐘）*</Label>
              <Input
                id="timeLimit"
                type="number"
                min="1"
                value={examFormData.timeLimit}
                onChange={(e) => setExamFormData({ ...examFormData, timeLimit: parseInt(e.target.value) || 60 })}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingScore">及格分數 *</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                value={examFormData.passingScore}
                onChange={(e) => setExamFormData({ ...examFormData, passingScore: parseInt(e.target.value) || 60 })}
                placeholder="60"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">
                將使用 <span className="font-semibold text-foreground">{selectedQuestions.length}</span> 個題目建立考試
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExamDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmCreateExam} disabled={!examFormData.title.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              確認建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次刪除確認對話框（15秒緩衝期） */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          cancelBatchDelete();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              確認刪除題目
            </DialogTitle>
            <DialogDescription>
              此操作無法復原，請謹慎操作
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="text-sm space-y-2">
                <p className="font-semibold text-destructive">
                  您即將刪除 {selectedQuestions.length} 個題目
                </p>
                <p className="text-muted-foreground">
                  刪除後，這些題目將從題庫中永久移除，且無法恢復。
                </p>
              </div>
            </div>
            
            {deleteCountdown > 0 && (
              <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-5xl font-bold text-destructive mb-2">
                    {deleteCountdown}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    秒後可以確認刪除
                  </div>
                </div>
              </div>
            )}
            
            {deleteCountdown === 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 text-center">
                  ✓ 現在可以執行刪除操作
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={cancelBatchDelete}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmBatchDelete}
              disabled={deleteCountdown > 0 || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  刪除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  確認刪除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 題目預覽對話框 */}
      <QuestionPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        questionId={previewQuestionId}
      />
    </div>
  );
}

