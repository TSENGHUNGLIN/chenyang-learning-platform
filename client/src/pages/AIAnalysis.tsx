import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, FileText, Download, Eye, Home, Clock, X, Trash2, Database } from "lucide-react";
import { toast } from "sonner";
import AnalysisResultView from "@/components/AnalysisResultView";
import { usePromptHistory } from "@/hooks/usePromptHistory";
import ImportQuestionsDialog from "@/components/ImportQuestionsDialog";

export default function AIAnalysis() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [analysisType, setAnalysisType] = useState<string>("generate_questions");
  const [analysisMode, setAnalysisMode] = useState<string>("file_only"); // AI分析模式
  const [customPrompt, setCustomPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  
  // 歷史提示詞功能
  const { history, addPrompt, removePrompt, clearAll, getRelativeTime } = usePromptHistory();
  
  // 匯入題庫相關狀態
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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

    // 只有在非出考題模式下才需要提示詞
    if (analysisType !== "generate_questions" && !customPrompt.trim()) {
      toast.error("請輸入提示詞");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await customAnalysisMutation.mutateAsync({
        fileIds: selectedFiles,
        analysisType: analysisType as "generate_questions" | "analyze_questions" | "other",
        analysisMode: analysisMode as "file_only" | "external" | "mixed",
        customPrompt: customPrompt,
      });
      
      setAnalysisResult(response.result);
      
      // 儲存提示詞到歷史記錄
      if (customPrompt.trim()) {
        addPrompt(customPrompt, analysisType);
      }
      
      toast.success("AI分析完成");
    } catch (error) {
      console.error("AI分析錯誤：", error);
      toast.error("分析失敗，請稍後再試");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportPDFMutation = trpc.analysis.exportPDF.useMutation();
  const exportWordMutation = trpc.analysis.exportWord.useMutation();
  const batchImportMutation = trpc.questions.batchImport.useMutation();

  // 匯入題庫功能
  const handleImportToQuestionBank = () => {
    console.log('點擊匯入題庫按鈕');
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
    
    console.log('開始載入解析模組...');
    
    // 解析AI分析結果
    import('@/utils/questionParser').then(({ parseQuestionsFromAnalysis }) => {
      console.log('模組載入成功，開始解析題目...');
      try {
        const questions = parseQuestionsFromAnalysis(analysisResult);
        console.log('解析結果:', questions);
        
        if (questions.length === 0) {
          toast.error("未能從AI分析結果中提取到題目，請確認結果格式是否正確");
          return;
        }
        
        console.log(`成功解析 ${questions.length} 個題目`);
        setParsedQuestions(questions);
        setShowImportDialog(true);
        toast.success(`成功解析 ${questions.length} 個題目`);
      } catch (error) {
        console.error('解析題目失敗:', error);
        toast.error(`解析題目失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    }).catch(error => {
      console.error('載入解析模組失敗:', error);
      toast.error("系統錯誤，無法載入題目解析模組");
    });
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
          <CardDescription>使用多條件組合篩選檔案</CardDescription>
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
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>選擇檔案</CardTitle>
              <CardDescription>
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI 分析設定</CardTitle>
          <CardDescription>
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
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || selectedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                開始 AI 分析
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 分析結果區域 */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>分析結果</CardTitle>
                <CardDescription>
                  基於 {selectedFiles.length} 個檔案的 AI 分析結果
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleImportToQuestionBank}
                  disabled={analysisType !== 'generate_questions'}
                >
                  <Database className="h-4 w-4 mr-2" />
                  匯入題庫
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  匯出 PDF
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
                {!previewFile.filename.toLowerCase().match(/\.(pdf|jpg|jpeg|png|gif|docx|doc|txt)$/) && (
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
    </div>
  );
}

