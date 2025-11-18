import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, FileText, Calendar, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import AnalysisResultView from "@/components/AnalysisResultView";

export default function AIAnalysis() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: filesData } = trpc.files.list.useQuery();

  // 獲取所有有AI分析結果的檔案
  const filesWithAnalysis = filesData?.files?.filter((file: any) => {
    // 這裡需要從資料庫查詢分析結果
    // 暫時顯示所有檔案
    return true;
  }) || [];

  // 根據篩選條件過濾檔案
  const filteredFiles = filesWithAnalysis.filter((file: any) => {
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

  const handleViewAnalysis = async (fileId: number) => {
    // 這裡需要查詢該檔案的分析結果
    // 暫時使用模擬資料
    setSelectedAnalysis({
      fileId,
      result: {
        summary: "載入中...",
        difficulty: { level: "中等", score: 0, reasoning: "" },
        performance: { strengths: [], weaknesses: [], suggestions: [] },
        knowledgeGaps: [],
        recommendedQuestions: []
      }
    });
    setShowResultDialog(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI 分析中心
        </h1>
        <p className="text-muted-foreground mt-2">
          查看所有考核檔案的 AI 分析結果，深入了解新人表現與成長建議
        </p>
      </div>

      {/* 篩選區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
          <CardDescription>使用多條件組合篩選分析結果</CardDescription>
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

      {/* 分析結果列表 */}
      <Card>
        <CardHeader>
          <CardTitle>分析結果列表</CardTitle>
          <CardDescription>共 {filteredFiles.length} 筆分析記錄</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>尚無分析記錄</p>
                <p className="text-sm mt-2">請先在檔案管理頁面對檔案執行 AI 分析</p>
              </div>
            ) : (
              filteredFiles.map((file: any) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">{file.filename}</h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {file.employee && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{file.employee.name}</span>
                            </div>
                          )}
                          {file.employee?.department && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              <span>{file.employee.department.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(file.uploadDate), "yyyy/MM/dd", { locale: zhTW })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAnalysis(file.id)}
                        className="ml-4"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        查看分析
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 分析結果對話框 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 分析結果</DialogTitle>
          </DialogHeader>
          {selectedAnalysis ? (
            <AnalysisResultView result={selectedAnalysis.result} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

