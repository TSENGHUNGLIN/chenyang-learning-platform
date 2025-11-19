import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Trash2, Plus, Download } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function QuestionBankDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const bankId = parseInt(params.id || "0");

  const { data: bank, isLoading: isBankLoading } = trpc.questionBanks.getById.useQuery(bankId);
  const { data: questions, isLoading: isQuestionsLoading, refetch } = trpc.questionBanks.getQuestions.useQuery(bankId);
  const removeQuestionMutation = trpc.questionBanks.removeQuestion.useMutation();

  const handleRemoveQuestion = async (questionId: number) => {
    if (!confirm("確定要從此題庫檔案移除這題嗎？")) {
      return;
    }

    try {
      await removeQuestionMutation.mutateAsync({
        bankId,
        questionId,
      });
      toast.success("題目已移除");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "移除失敗");
    }
  };

  const handleExportToWord = () => {
    if (!bank || !questions || questions.length === 0) {
      toast.error("無法匯出：題庫中沒有題目");
      return;
    }

    try {
      // 建立 Word 文件內容（使用 Markdown 格式）
      let content = `# ${bank.name}\n\n`;
      
      if (bank.description) {
        content += `${bank.description}\n\n`;
      }
      
      content += `**題目總數：** ${questions.length} 題\n\n`;
      if (bank.source) {
        content += `**來源：** ${bank.source}\n\n`;
      }
      content += `**建立日期：** ${new Date(bank.createdAt).toLocaleDateString("zh-TW")}\n\n`;
      content += `---\n\n`;
      
      // 加入所有題目
      questions.forEach((q, index) => {
        content += `## 題目 ${index + 1}\n\n`;
        content += `**類型：** ${getTypeText(q.type)}\n\n`;
        content += `**難度：** ${getDifficultyText(q.difficulty)}\n\n`;
        content += `**題目：** ${q.question}\n\n`;
        
        // 如果是選擇題，顯示選項
        if (q.type === 'multiple_choice' && q.options) {
          try {
            const options = JSON.parse(q.options);
            content += `**選項：**\n\n`;
            Object.entries(options).forEach(([key, value]) => {
              content += `- ${key}. ${value}\n`;
            });
            content += `\n`;
          } catch (e) {
            // 如果解析失敗，直接顯示原始內容
            content += `**選項：** ${q.options}\n\n`;
          }
        }
        
        content += `**正確答案：** ${q.correctAnswer}\n\n`;
        
        if (q.explanation) {
          content += `**解釋：** ${q.explanation}\n\n`;
        }
        
        if (q.source) {
          content += `**題目來源：** ${q.source}\n\n`;
        }
        
        content += `---\n\n`;
      });
      
      // 建立 Blob 並下載
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bank.name}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("已匯出題庫檔案");
    } catch (error: any) {
      console.error('匯出錯誤:', error);
      toast.error(error.message || "匯出失敗");
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

  const getDifficultyText = (difficulty: string) => {
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

  const getTypeText = (type: string) => {
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

  if (isBankLoading || isQuestionsLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!bank) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium mb-2">找不到題庫檔案</p>
              <Button onClick={() => setLocation("/question-banks")}>
                返回列表
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/question-banks")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回題庫檔案列表
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{bank.name}</CardTitle>
                {bank.description && (
                  <p className="text-muted-foreground">{bank.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span>共 {bank.questionCount} 題</span>
                  {bank.source && (
                    <>
                      <span>•</span>
                      <span>來源：{bank.source}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>
                    建立於 {new Date(bank.createdAt).toLocaleDateString("zh-TW")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportToWord}
                >
                  <Download className="h-4 w-4 mr-2" />
                  匯出
                </Button>
                <Button
                  onClick={() => {
                    toast.info("此功能將在題庫管理頁面中實作");
                    setLocation("/question-bank");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增題目
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {!questions || questions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">此題庫檔案尚無題目</p>
              <p className="text-sm text-muted-foreground mb-4">
                從題庫管理頁面新增題目到此檔案
              </p>
              <Button onClick={() => setLocation("/question-bank")}>
                前往題庫管理
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={q.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          第 {index + 1} 題
                        </span>
                        <Badge variant="outline">{getTypeText(q.type)}</Badge>
                        <Badge className={getDifficultyColor(q.difficulty)}>
                          {getDifficultyText(q.difficulty)}
                        </Badge>
                      </div>
                      <p className="text-base mb-3">{q.question}</p>
                      {q.type === "multiple_choice" && q.options && (
                        <div className="space-y-1 text-sm text-muted-foreground mb-2">
                          {JSON.parse(q.options).map((option: string, i: number) => (
                            <div key={i}>
                              {String.fromCharCode(65 + i)}. {option}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-muted-foreground">正確答案：</span>
                        <span className="font-medium">{q.correctAnswer}</span>
                      </div>
                      {q.explanation && (
                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">解析：</span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

