import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, FileText, Download, Eye, Home, Clock, X, Trash2, Database, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import AnalysisResultView from "@/components/AnalysisResultView";
import { usePromptHistory } from "@/hooks/usePromptHistory";
import ImportQuestionsDialog from "@/components/ImportQuestionsDialog";
import CSVTableView from "@/components/CSVTableView";

export default function AIAnalysis() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [analysisType, setAnalysisType] = useState<string>("generate_questions");
  const [analysisMode, setAnalysisMode] = useState<string>("file_only"); // AI分析模式
  const [sourceMode, setSourceMode] = useState<string>("manual"); // 考題出處模式：manual 或 ai
  const [manualSource, setManualSource] = useState(""); // 人工填寫的考題出處
  const [aiSourceFile, setAiSourceFile] = useState<number | null>(null); // AI分析選擇的檔案ID
  const [customPrompt, setCustomPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>("");
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [csvData, setCsvData] = useState<any>(null);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [useCache, setUseCache] = useState(true); // 是否使用快取
  const [fromCache, setFromCache] = useState(false); // 當前結果是否來自快取
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null); // 當前分析的ID
  const [hasRated, setHasRated] = useState(false); // 是否已評分
  
  // 歷史提示詞功能
  const { history, addPrompt, removePrompt, clearAll, getRelativeTime } = usePromptHistory();
  
  // 匯入題庫相關狀態
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // 儲存為題庫檔案相關狀態
  const [showSaveBankDialog, setShowSaveBankDialog] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankDescription, setBankDescription] = useState("");
  const [useAIName, setUseAIName] = useState(true);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);

  // 根據分析類型返回提示詞前綴
  const getPromptPrefix = () => {
    switch (analysisType) {
      case "generate_questions":
        return "題目方式：";
      case "analyze_questions":
        return "分析：";
      case "other":
        return "其他：";
      default:
        return "";
    }
  };

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: filesData } = trpc.files.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: tags } = trpc.tags.list.useQuery();

  const files = filesData?.files || [];

  // 根據篩選條件過濾檔案
  const filteredFiles = files.filter((file: any) => {
    if (selectedDepartment && selectedDepartment !== "all" && file.employee?.departmentId !== parseInt(selectedDepartment)) {
      return false;
    }
    if (selectedEmployee && selectedEmployee !== "all" && file.employeeId !== parseInt(selectedEmployee)) {
      return false;
    }
    if (searchKeyword && !file.filename.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredEmployees = selectedDepartment && selectedDepartment !== "all"
    ? employees?.filter((emp) => emp.departmentId === parseInt(selectedDepartment))
    : employees;

  // CSV 預視查詢
  const csvPreviewQuery = trpc.files.previewCSV.useQuery(
    { 
      fileUrl: previewFile?.fileUrl || '',
      maxRows: 100,
    },
    { 
      enabled: !!previewFile && !!previewFile.fileUrl && previewFile.filename.toLowerCase().endsWith('.csv'),
      refetchOnWindowFocus: false,
    }
  );

  // 當 CSV 預視資料載入完成時，更新 csvData
  useEffect(() => {
    if (previewFile?.filename.toLowerCase().endsWith('.csv')) {
      setIsLoadingCsv(csvPreviewQuery.isLoading);
      if (csvPreviewQuery.data) {
        setCsvData(csvPreviewQuery.data);
      } else if (csvPreviewQuery.error) {
        setCsvData(null);
        toast.error('載入 CSV 檔案失敗');
      }
    } else {
      setCsvData(null);
      setIsLoadingCsv(false);
    }
  }, [previewFile, csvPreviewQuery.data, csvPreviewQuery.isLoading, csvPreviewQuery.error]);

  const handleFileToggle = (fileId: number) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map((f: any) => f.id));
    }
  };

  const customAnalysisMutation = trpc.analysis.customAnalysis.useMutation();

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.error("請至少選擇一個檔案");
      return;
    }

    // 驗證考題出處是否已填寫
    if (sourceMode === "manual" && !manualSource.trim()) {
      toast.error("請填寫考題出處（必填）");
      return;
    }
    if (sourceMode === "ai" && !aiSourceFile) {
      toast.error("請選擇考題出處檔案");
      return;
    }

    // 只有在非出考題模式下才需要提示詞
    if (analysisType !== "generate_questions" && !customPrompt.trim()) {
      toast.error("請輸入提示詞");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStartTime(Date.now());
    setShowTimeoutWarning(false);
    setAnalysisStage("正在讀取檔案...");
    setAnalysisProgress(10);
    
    // 設定30秒後顯示提示
    const timeoutWarning = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, 30000);
    
    // 模擬進度更新
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev < 90) return prev + 5;
        return prev;
      });
    }, 2000);
    
    try {
      // 階段 1: 讀取檔案
      setAnalysisStage("正在讀取檔案...");
      setAnalysisProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 階段 2: 準備分析
      setAnalysisStage("正在準備分析...");
      setAnalysisProgress(30);
      // 準備考題出處
      let questionSource = "";
      if (sourceMode === "manual") {
        questionSource = manualSource.trim();
      } else if (sourceMode === "ai" && aiSourceFile) {
        // 從檔案列表中找到對應的檔案名稱
        const sourceFile = files?.find(f => f.id === aiSourceFile);
        questionSource = sourceFile?.filename || String(aiSourceFile);
      }

      // 階段 3: 執行 AI 分析
      setAnalysisStage("正在執行 AI 分析...");
      setAnalysisProgress(50);
      
      const response = await customAnalysisMutation.mutateAsync({
        fileIds: selectedFiles,
        analysisType: analysisType as "generate_questions" | "analyze_questions" | "other",
        analysisMode: analysisMode as "file_only" | "external" | "mixed",
        customPrompt: customPrompt,
        questionSource: questionSource, // 新增考題出處
        useCache: useCache, // 使用快取設定
      });
      
      // 階段 4: 處理結果
      setAnalysisStage("正在處理結果...");
      setAnalysisProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setAnalysisResult(response.result);
      setFromCache(response.fromCache || false);
      setCurrentAnalysisId(response.cacheId || null);
      setHasRated(false); // 重置評分狀態
      
      // 自動填入檔案名稱作為題庫名稱（移除副檔名）
      if (analysisType === "generate_questions" && selectedFiles.length > 0) {
        const firstFile = files?.find(f => f.id === selectedFiles[0]);
        if (firstFile) {
          // 移除副檔名
          const nameWithoutExt = firstFile.filename.replace(/\.(pdf|docx|csv|txt|doc|xlsx|xls)$/i, '');
          setBankName(nameWithoutExt);
          setBankDescription(`根據檔案「${firstFile.filename}」生成的題庫，包含 ${response.result.questionsWithAnswers?.length || 0} 道題目`);
        }
      }
      
      // 完成
      setAnalysisStage("分析完成！");
      setAnalysisProgress(100);
      
      // 如果使用了快取，顯示提示
      if (response.fromCache) {
        toast.success("使用快取結果，節省了分析時間！", {
          description: "此結果來自之前的分析，如需重新分析請關閉快取功能",
        });
      }
      
      // 儲存提示詞到歷史記錄
      if (customPrompt.trim()) {
        addPrompt(customPrompt, analysisType);
      }
      
      toast.success("AI分析完成");
    } catch (error: any) {
      console.error("AI分析錯誤：", error);
      
      // 提取詳細錯誤訊息
      let errorMessage = "分析失敗，請稍後再試";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.shape?.message) {
        errorMessage = error.shape.message;
      }
      
      // 顯示更詳細的錯誤訊息
      toast.error(errorMessage, {
        duration: 5000,
        description: "如果問題持續，請嘗試：1) 減少選擇的檔案數量 2) 簡化提示詞 3) 稍後再試",
      });
    } finally {
      clearTimeout(timeoutWarning);
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setAnalysisStartTime(null);
      setShowTimeoutWarning(false);
      setAnalysisStage("");
      setAnalysisProgress(0);
    }
  };

  const exportPDFMutation = trpc.analysis.exportPDF.useMutation();
  const exportWordMutation = trpc.analysis.exportWord.useMutation();
  const rateAnalysisMutation = trpc.analysis.rateAnalysis.useMutation();
  
  // 評分函數
  const handleRateAnalysis = async (score: number) => {
    if (!currentAnalysisId) {
      toast.error("無法評分：未找到分析記錄ID");
      return;
    }
    
    if (hasRated) {
      toast.info("您已經評分過此結果");
      return;
    }
    
    try {
      await rateAnalysisMutation.mutateAsync({
        id: currentAnalysisId,
        qualityScore: score,
      });
      
      setHasRated(true);
      
      if (score > 0) {
        toast.success("感謝您的正面反饋！", {
          description: "我們會繼續保持AI分析的高品質",
        });
      } else {
        toast.success("感謝您的反饋！", {
          description: "我們會持續改進AI分析品質",
        });
      }
    } catch (error) {
      console.error("評分錯誤：", error);
      toast.error("評分失敗，請稍後再試");
    }
  };
  const batchImportMutation = trpc.questions.batchImport.useMutation();
  
  // 題庫檔案相關mutation
  const generateNameMutation = trpc.questionBanks.generateName.useMutation();
  const createWithQuestionsMutation = trpc.questionBanks.createWithQuestions.useMutation();
  const utils = trpc.useUtils();

  // 匯入題庫功能
  const handleImportToQuestionBank = () => {
    console.log('===== handleImportToQuestionBank 被呼叫 =====')
    console.log('analysisResult:', analysisResult);
    console.log('analysisType:', analysisType);
    
    if (!analysisResult) {
      toast.error("請先執行AI分析以獲取結果");
      return;
    }
    
    if (analysisType !== 'generate_questions') {
      toast.error("只有「出考題」類型的分析結果可以匯入題庫");
      return;
    }
    
    try {
      // 直接從analysisResult中提取questionsWithAnswers陣列
      const questionsData = analysisResult.questionsWithAnswers;
      
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        toast.error("未能從AI分析結果中找到題目資料");
        return;
      }
      
      console.log('提取的題目資料:', questionsData);
      
      // 將AI結構化資料轉換為ParsedQuestion格式
      const parsedQuestions = questionsData.map((q: any) => {
        // 轉換題型
        let type: "true_false" | "multiple_choice" | "short_answer";
        if (q.type === "是非題") {
          type = "true_false";
        } else if (q.type === "選擇題") {
          type = "multiple_choice";
        } else {
          type = "short_answer";
        }
        
        // 轉換選項為JSON字串
        let options: string | undefined;
        if (type === "multiple_choice" && Array.isArray(q.options)) {
          const optionsObj: Record<string, string> = {};
          q.options.forEach((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            optionsObj[letter] = opt;
          });
          options = JSON.stringify(optionsObj);
        }
        
        // 推斷難度
        const difficulty = type === "true_false" ? "easy" : type === "short_answer" ? "hard" : "medium";
        
        // 使用使用者填寫或選擇的考題出處
        let questionSource = "";
        if (sourceMode === "manual") {
          questionSource = manualSource.trim();
        } else if (sourceMode === "ai" && aiSourceFile) {
          // 從檔案列表中找到對應的檔案名稱
          const sourceFile = files?.find((f: any) => f.id === aiSourceFile);
          questionSource = sourceFile?.filename || String(aiSourceFile);
        }
        
        // 處理 AI 建議的分類
        let suggestedCategoryId: number | undefined;
        if (q.suggestedCategory && categories) {
          const category = categories.find((c: any) => c.name === q.suggestedCategory);
          if (category) {
            suggestedCategoryId = category.id;
          }
        }
        
        // 處理 AI 建議的標籤
        let suggestedTagIds: string | undefined;
        if (q.suggestedTags && Array.isArray(q.suggestedTags) && tags) {
          const tagIdArray: number[] = [];
          q.suggestedTags.forEach((tagName: string) => {
            const tag = tags.find((t: any) => t.name === tagName);
            if (tag) {
              tagIdArray.push(tag.id);
            }
          });
          if (tagIdArray.length > 0) {
            suggestedTagIds = JSON.stringify(tagIdArray);
          }
        }
        
        return {
          type,
          difficulty,
          question: q.question,
          options,
          correctAnswer: q.answer,
          explanation: q.explanation,
          source: questionSource || '未知',
          isAiGenerated: 1, // 標記為 AI 生成
          suggestedCategoryId, // AI 建議的分類 ID
          suggestedTagIds, // AI 建議的標籤 ID（JSON 格式）
        };
      });
      
      console.log('轉換後的題目:', parsedQuestions);
      setParsedQuestions(parsedQuestions);
      setShowImportDialog(true);
      toast.success(`成功解析 ${parsedQuestions.length} 個題目`);
    } catch (error) {
      console.error('解析題目失敗:', error);
      toast.error(`解析題目失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };
  
  // AI自動命名
  const handleGenerateAIName = async () => {
    if (!analysisResult || analysisType !== 'generate_questions') {
      toast.error("請先執行AI分析以獲取結果");
      return;
    }
    
    try {
      setIsGeneratingName(true);
      console.log('[AI命名] analysisResult:', analysisResult);
      const questionsData = analysisResult.questionsWithAnswers;
      console.log('[AI命名] questionsData:', questionsData);
      console.log('[AI命名] questionsData是否為陣列:', Array.isArray(questionsData));
      
      if (!Array.isArray(questionsData)) {
        toast.error("題目資料格式錯誤：不是陣列");
        console.error('[AI命名] questionsData不是陣列:', typeof questionsData);
        return;
      }
      
      // 轉換為後端期望的格式（只保留必要欄位）
      const formattedQuestions = questionsData.map((q: any) => ({
        type: q.type,
        question: q.question,
        correctAnswer: q.correctAnswer || q.answer || '',
      }));
      
      console.log('[AI命名] formattedQuestions:', formattedQuestions);
      console.log('[AI命名] 傳送的資料:', { questions: formattedQuestions });
      
      const result = await generateNameMutation.mutateAsync({ questions: formattedQuestions });
      setBankName(result.name);
      toast.success("已生成AI建議名稱");
    } catch (error: any) {
      toast.error(`AI命名失敗：${error.message}`);
    } finally {
      setIsGeneratingName(false);
    }
  };
  
  // 儲存為題庫檔案（重寫版本 - Plan B）
  const handleSaveAsQuestionBank = async () => {
    if (!analysisResult || analysisType !== 'generate_questions') {
      toast.error("只有「出考題」類型的分析結果可以儲存為題庫檔案");
      return;
    }
    
    if (!bankName.trim()) {
      toast.error("請輸入檔案名稱");
      return;
    }
    
    try {
      setIsSavingBank(true);
      
      // 檢查題庫名稱是否已存在
      let finalBankName = bankName.trim();
      const checkResult = await utils.questionBanks.checkNameExists.fetch(finalBankName);
      if (checkResult.exists) {
        setIsSavingBank(false);
        const confirmed = window.confirm(
          `題庫「${finalBankName}」已存在！\n\n點擊「確定」自動加上時間戳並繼續儲存\n點擊「取消」修改名稱後再試`
        );
        if (!confirmed) {
          // 使用者選擇取消，讓他修改名稱
          toast.info("請修改題庫名稱後再試一次");
          return;
        }
        // 使用者選擇確定，自動加上時間戳
        const timestamp = new Date().getTime();
        finalBankName = `${finalBankName} (${timestamp})`;
        setBankName(finalBankName);
        toast.info(`已自動調整為「${finalBankName}」`);
        setIsSavingBank(true);
      }
      
      // 從 AI 分析結果中提取題目資料
      const questionsData = analysisResult.questionsWithAnswers;
      
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        toast.error("未能從AI分析結果中找到題目資料");
        return;
      }
      
      // 轉換題目格式為後端期望的格式
      const questions = questionsData.map((q: any) => {
        // 轉換題型
        let type: 'true_false' | 'multiple_choice' | 'short_answer' = 'short_answer';
        if (q.type === '是非題' || q.type === 'true_false') {
          type = 'true_false';
        } else if (q.type === '選擇題' || q.type === 'multiple_choice') {
          type = 'multiple_choice';
        }
        
        // 轉換選項為JSON字串
        let options: string | undefined;
        if (type === 'multiple_choice' && Array.isArray(q.options)) {
          const optionsObj: Record<string, string> = {};
          q.options.forEach((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            optionsObj[letter] = opt;
          });
          options = JSON.stringify(optionsObj);
        }
        
        // 推斷難度
        const difficulty: 'easy' | 'medium' | 'hard' = type === 'true_false' ? 'easy' : type === 'short_answer' ? 'hard' : 'medium';
        
        // 使用使用者填寫或選擇的考題出處
        let questionSource = "";
        if (sourceMode === "manual") {
          questionSource = manualSource.trim();
        } else if (sourceMode === "ai" && aiSourceFile) {
          // 從檔案列表中找到對應的檔案名稱
          const sourceFile = files?.find((f: any) => f.id === aiSourceFile);
          questionSource = sourceFile?.filename || String(aiSourceFile);
        }
        
        return {
          type,
          difficulty,
          question: q.question,
          options,
          correctAnswer: q.answer || q.correctAnswer || '',
          explanation: q.explanation || '',
          source: questionSource || '由AI分析生成',
        };
      });
      
      console.log('[儲存題庫] 轉換後的題目:', questions);
      console.log('[儲存題庫] 題目數量:', questions.length);
      
      // 檢查 mutation 是否存在
      console.log('[儲存題庫] createWithQuestionsMutation:', createWithQuestionsMutation);
      console.log('[儲存題庫] mutateAsync 類型:', typeof createWithQuestionsMutation.mutateAsync);
      
      // 呼叫新的 createWithQuestions API（一次完成所有操作）
      console.log('[儲存題庫] 準備呼叫 API...');
      const result = await createWithQuestionsMutation.mutateAsync({
        name: finalBankName,
        description: bankDescription || `由AI分析生成，包含 ${questions.length} 道題目`,
        questions,
      });
      
      console.log('[儲存題庫] API回應:', result);
      
      // 顯示成功訊息
      const successMessage = `已成功儲存 ${result.results.success} 道題目到題庫「${result.bankName}」`;
      const descriptionText = result.results.failed > 0 
        ? `${result.results.failed} 道題目儲存失敗` 
        : '所有題目均儲存成功';
      
      toast.success(successMessage, {
        description: descriptionText,
        action: {
          label: '立即查看',
          onClick: () => {
            window.location.href = `/question-banks/${result.bankId}`;
          },
        },
      });
      
      // 如果有錯誤，顯示錯誤訊息
      if (result.results.errors && Array.isArray(result.results.errors) && result.results.errors.length > 0) {
        console.error('[儲存題庫] 錯誤:', result.results.errors);
        const errorMessages = result.results.errors.slice(0, 3).join('\n');
        toast.warning(`部分題目匣入失敗: ${errorMessages}`);
      }
      
      // 關閉對話框並重置狀態
      setShowSaveBankDialog(false);
      setBankName("");
      setBankDescription("");
      setUseAIName(true);
    } catch (error: any) {
      console.error('[儲存題庫] 錯誤:', error);
      
      // 提取詳細錯誤訊息
      let errorMessage = "儲存失敗，請稍後再試";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.shape?.message) {
        errorMessage = error.shape.message;
      }
      
      toast.error(`儲存失敗：${errorMessage}`);
    } finally {
      setIsSavingBank(false);
    }
  };
  
  // 匯出功能
  const handleExport = async (format: 'pdf' | 'word') => {
    if (!analysisResult) {
      toast.error("請先執行AI分析以獲取結果");
      return;
    }
    
    const selectedFileNames = files
      .filter((f: any) => selectedFiles.includes(f.id))
      .map((f: any) => f.filename);
    
    try {
      toast.info(`正在匯出為 ${format.toUpperCase()} 檔案...`);
      
      const result = format === 'pdf'
        ? await exportPDFMutation.mutateAsync({
            result: analysisResult,
            fileNames: selectedFileNames,
          })
        : await exportWordMutation.mutateAsync({
            result: analysisResult,
            fileNames: selectedFileNames,
          });
      
      // 下載檔案
      const blob = new Blob(
        [Uint8Array.from(atob(result.base64), c => c.charCodeAt(0))],
        { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format.toUpperCase()} 檔案已下載`);
    } catch (error) {
      toast.error(`匯出失敗：${error}`);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI 分析出題中心
          </h1>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            返回首頁
          </Button>
        </div>
        <p className="text-muted-foreground mt-2">
          選擇檔案並輸入自訂提示詞，使用 AI 進行深度分析
        </p>
      </div>

      {/* 篩選條件區域 */}
      <Card className="mb-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="text-teal-900 dark:text-teal-100">篩選條件</CardTitle>
          <CardDescription className="text-teal-700 dark:text-teal-300">使用多條件組合篩選檔案</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>關鍵字搜尋</Label>
              <Input
                placeholder="搜尋檔案名稱..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>部門</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="所有部門" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有部門</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>人員</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="所有人員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有人員</SelectItem>
                  {filteredEmployees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 檔案選擇區域 */}
      <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-900 dark:text-blue-100">選擇檔案</CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                已選擇 {selectedFiles.length} / {filteredFiles.length} 個檔案
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedFiles.length === filteredFiles.length ? "取消全選" : "全選"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>沒有符合條件的檔案</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredFiles.map((file: any) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selectedFiles.includes(file.id)}
                    onCheckedChange={() => handleFileToggle(file.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{file.filename}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {file.employee?.name && `${file.employee.name} · `}
                      {file.employee?.department?.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(file);
                      setShowPreviewDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    預視
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI分析區域 */}
      <Card className="mb-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-purple-900 dark:text-purple-100">AI 分析設定</CardTitle>
          <CardDescription className="text-purple-700 dark:text-purple-300">
            輸入自訂提示詞，例如：「從題庫選擇10個是非、10個選擇、4個問答」
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysisType">分析類型</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇分析類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generate_questions">出考題</SelectItem>
                  <SelectItem value="analyze_questions">題目分析</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceMode">考題出處模式</Label>
              <Select value={sourceMode} onValueChange={setSourceMode}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇出處模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">人工填寫</SelectItem>
                  <SelectItem value="ai">AI分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 考題出處輸入欄位 */}
          <div className="space-y-2">
            <Label htmlFor="questionSource">
              考題出處 <span className="text-red-500">*</span>
            </Label>
            {sourceMode === "manual" ? (
              <>
                <Input
                  id="questionSource"
                  placeholder="請輸入考題出處（必填）"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium">填寫範例：</span>
                  <br />
                  • 單一檔案：使用檔案全名，例如「邱紫郁轉正考核問答」
                  <br />
                  • 多個檔案：使用最關鍵的共同字詞，例如「轉正考核問答」
                </p>
              </>
            ) : (
              <Select value={aiSourceFile?.toString()} onValueChange={(val) => setAiSourceFile(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="從已上傳檔案中選擇" />
                </SelectTrigger>
                <SelectContent>
                  {filteredFiles.map((file: any) => (
                    <SelectItem key={file.id} value={file.id.toString()}>
                      {file.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysisMode">AI 分析模式</Label>
              <Select value={analysisMode} onValueChange={setAnalysisMode}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇分析模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file_only">
                    <div className="flex flex-col">
                      <span className="font-medium">檔案內資料分析</span>
                      <span className="text-xs text-muted-foreground">只使用上傳檔案內容（推薦）</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="external">
                    <div className="flex flex-col">
                      <span className="font-medium">外部資訊分析</span>
                      <span className="text-xs text-muted-foreground">可引用外部知識</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mixed">
                    <div className="flex flex-col">
                      <span className="font-medium">綜合運用</span>
                      <span className="text-xs text-muted-foreground">結合檔案與外部資訊</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">提示詞</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-sm text-muted-foreground z-10">
                {getPromptPrefix()}
              </span>
              <Textarea
                id="prompt"
                placeholder={
                  analysisType === "generate_questions"
                    ? "從題庫選擇10個是非、10個選擇、4個問答"
                    : analysisType === "analyze_questions"
                    ? "分析這些考核檔案的整體表現和弱點"
                    : "請輸入您的分析需求"
                }
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={6}
                className="resize-none pl-24"
              />
            </div>
            {/* 歷史提示詞 */}
            {history.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>歷史提示詞</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    清除全部
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors cursor-pointer"
                      onClick={() => setCustomPrompt(item.prompt)}
                    >
                      <span className="max-w-xs truncate">{item.prompt}</span>
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(item.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePrompt(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 快取開關 */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">使用快取結果</p>
                <p className="text-xs text-muted-foreground">相同的檔案和提示詞將直接返回之前的分析結果</p>
              </div>
            </div>
            <Switch
              checked={useCache}
              onCheckedChange={setUseCache}
            />
          </div>
          
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || selectedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {analysisStage} ({analysisProgress}%)
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                開始 AI 分析
              </>
            )}
          </Button>
          
          {/* Timeout警告訊息 */}
          {showTimeoutWarning && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Loader2 className="h-5 w-5 text-amber-600 animate-spin mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    AI分析需要較長時間
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    系統正在處理您的請求，請耐心等候。如果超過2分鐘仍未完成，建議重新嘗試並減少檔案數量或簡化提示詞。
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分析結果區域 */}
      {analysisResult && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">分析結果</CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  基於 {selectedFiles.length} 個檔案的 AI 分析結果
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    console.log('===== 按鈕被點擊 ====');
                    console.log('analysisType:', analysisType);
                    handleImportToQuestionBank();
                  }}
                >
                  <Database className="h-4 w-4 mr-2" />
                  匯入題庫
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowSaveBankDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  儲存為題庫檔案
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('word')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  匯出 Word
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AnalysisResultView result={analysisResult} />
            
            {/* 品質評分區域 */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">此分析結果是否有幫助？</p>
                  <p className="text-xs text-muted-foreground mt-1">您的反饋將幫助我們持續改進AI分析品質</p>
                </div>
                <div className="flex gap-2">
                  {hasRated ? (
                    <p className="text-sm text-muted-foreground">感謝您的反饋！</p>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRateAnalysis(1)}
                        className="hover:bg-green-50 hover:border-green-500 hover:text-green-600"
                        disabled={!currentAnalysisId}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        有幫助
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRateAnalysis(-1)}
                        className="hover:bg-red-50 hover:border-red-500 hover:text-red-600"
                        disabled={!currentAnalysisId}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        需改進
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 檔案預視對話框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile && (
              <div className="space-y-4">
                {/* PDF預視 */}
                {previewFile.filename.toLowerCase().endsWith('.pdf') && (
                  <iframe
                    src={previewFile.fileUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title="PDF Preview"
                  />
                )}
                
                {/* 圖片預視 */}
                {(previewFile.filename.toLowerCase().endsWith('.jpg') ||
                  previewFile.filename.toLowerCase().endsWith('.jpeg') ||
                  previewFile.filename.toLowerCase().endsWith('.png') ||
                  previewFile.filename.toLowerCase().endsWith('.gif')) && (
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.filename}
                    className="w-full h-auto rounded-lg"
                  />
                )}
                
                {/* CSV 檔案預視 */}
                {previewFile.filename.toLowerCase().endsWith('.csv') && (
                  <div className="p-4">
                    {isLoadingCsv ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">載入中...</span>
                      </div>
                    ) : csvData ? (
                      <CSVTableView data={csvData} />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>無法載入 CSV 檔案</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => window.open(previewFile.fileUrl, '_blank')}
                        >
                          下載檔案
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Word/文字檔案預視（顯示提取的文字） */}
                {(previewFile.filename.toLowerCase().endsWith('.docx') ||
                  previewFile.filename.toLowerCase().endsWith('.doc') ||
                  previewFile.filename.toLowerCase().endsWith('.txt')) && (
                  <div className="p-6 bg-muted rounded-lg">
                    {previewFile.extractedText ? (
                      <div className="whitespace-pre-wrap text-sm">
                        {previewFile.extractedText}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>無法預視此檔案，請下載後查看</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => window.open(previewFile.fileUrl, '_blank')}
                        >
                          下載檔案
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 其他檔案類型 */}
                {!previewFile.filename.toLowerCase().match(/\.(pdf|jpg|jpeg|png|gif|docx|doc|txt|csv)$/) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">此檔案類型不支援預視</p>
                    <p className="text-sm mb-4">請下載檔案後使用專用軟體開啟</p>
                    <Button
                      onClick={() => window.open(previewFile.fileUrl, '_blank')}
                    >
                      下載檔案
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 匯入題庫對話框 */}
      <ImportQuestionsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        questions={parsedQuestions}
        onImportSuccess={() => {
          toast.success("題目已成功匯入題庫");
        }}
      />
      
      {/* 儲存為題庫檔案對話框 */}
      <Dialog open={showSaveBankDialog} onOpenChange={setShowSaveBankDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              儲存為題庫檔案
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              題庫名稱已自動從檔案名稱填入，您可以直接儲存或修改名稱
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg">
              <Checkbox
                id="useAIName"
                checked={useAIName}
                onCheckedChange={(checked) => {
                  setUseAIName(checked as boolean);
                  if (checked && !bankName) {
                    handleGenerateAIName();
                  }
                }}
              />
              <div className="flex-1">
                <Label htmlFor="useAIName" className="text-sm font-medium cursor-pointer">
                  使用 AI 重新命名
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  勾選後可讓 AI 根據題目內容生成新的名稱
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="bankName">題庫名稱 *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="例如：業管部 彭睛婕 第1課 新進業工務設計師訓練課程"
                  disabled={useAIName && isGeneratingName}
                />
                {useAIName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAIName}
                    disabled={isGeneratingName}
                    title="讓 AI 根據題目內容重新生成名稱"
                  >
                    {isGeneratingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                💡 提示：如需修改題庫名稱，請在上傳檔案前修改檔案名稱
              </p>
            </div>
            
            <div>
              <Label htmlFor="bankDescription">檔案說明</Label>
              <Textarea
                id="bankDescription"
                value={bankDescription}
                onChange={(e) => setBankDescription(e.target.value)}
                placeholder="簡單描述這個題庫檔案的內容..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSaveBankDialog(false);
                  setBankName("");
                  setBankDescription("");
                  setUseAIName(true);
                }}
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleSaveAsQuestionBank}
                disabled={!bankName || isSavingBank}
              >
                {isSavingBank ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    儲存中...
                  </>
                ) : (
                  "儲存"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

