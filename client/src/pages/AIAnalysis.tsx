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
import { Loader2, Sparkles, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import AnalysisResultView from "@/components/AnalysisResultView";

export default function AIAnalysis() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.error("請至少選擇一個檔案");
      return;
    }

    setIsAnalyzing(true);
    try {
      // 這裡需要調用AI分析API
      // 暫時使用模擬資料
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAnalysisResult({
        summary: "分析完成",
        difficulty: { level: "中等", score: 70, reasoning: "基於選定的檔案內容分析" },
        performance: {
          strengths: ["表現良好的部分"],
          weaknesses: ["需要改進的部分"],
          suggestions: ["具體建議"]
        },
        knowledgeGaps: [],
        recommendedQuestions: []
      });
      
      toast.success("AI分析完成");
    } catch (error) {
      toast.error("分析失敗，請稍後再試");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportPDFMutation = trpc.analysis.exportPDF.useMutation();
  const exportWordMutation = trpc.analysis.exportWord.useMutation();

  const handleExport = async (format: 'pdf' | 'word') => {
    if (!analysisResult) {
      toast.error("尚無分析結果可匯出");
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI 分析中心
        </h1>
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
          <div className="space-y-2">
            <Label htmlFor="prompt">提示詞</Label>
            <Textarea
              id="prompt"
              placeholder="請輸入分析需求，例如：&#10;- 分析這些考核檔案的整體表現&#10;- 從題庫選擇10個是非題、10個選擇題、4個問答題&#10;- 針對弱點提供改進建議&#10;- 推薦適合的進階學習資源"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={6}
              className="resize-none"
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
    </div>
  );
}

