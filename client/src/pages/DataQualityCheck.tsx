import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

export default function DataQualityCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const { data: checkResult, refetch: refetchCheck } = trpc.dataQuality.checkQuestions.useQuery();
  const fixOptionsMutation = trpc.dataQuality.fixOptionsFormat.useMutation();

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await refetchCheck();
      toast.success("檢查完成");
    } catch (error) {
      toast.error("檢查失敗");
    } finally {
      setIsChecking(false);
    }
  };

  const handleFixAll = async () => {
    if (!checkResult?.invalidOptionsQuestions || checkResult.invalidOptionsQuestions.length === 0) {
      toast.info("沒有需要修復的題目");
      return;
    }

    setIsFixing(true);
    try {
      const result = await fixOptionsMutation.mutateAsync();
      toast.success(`已修復 ${result.fixedCount} 道題目`);
      await refetchCheck();
    } catch (error) {
      toast.error("修復失敗");
    } finally {
      setIsFixing(false);
    }
  };

  const totalIssues = (checkResult?.invalidOptionsQuestions?.length || 0) + 
                      (checkResult?.missingFieldsQuestions?.length || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <PageHeader
        title="考題品質檢查"
        description="自動掃描並修復題目資料格式問題"
        icon={Settings}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-100 dark:bg-purple-900/20"
        gradientFrom="from-purple-500/20"
        gradientTo="to-pink-500/20"
      />

      <div className="container py-8 space-y-6">
        {/* 統計卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總題目數</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkResult?.totalQuestions || 0}</div>
              <p className="text-xs text-muted-foreground">題庫中的所有題目</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">發現問題</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalIssues}</div>
              <p className="text-xs text-muted-foreground">需要處理的題目</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">資料品質</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {checkResult?.totalQuestions 
                  ? Math.round((1 - totalIssues / checkResult.totalQuestions) * 100) 
                  : 100}%
              </div>
              <p className="text-xs text-muted-foreground">格式正確的題目比例</p>
            </CardContent>
          </Card>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <Button 
            onClick={handleCheck} 
            disabled={isChecking}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                檢查中...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新檢查
              </>
            )}
          </Button>

          {totalIssues > 0 && (
            <Button 
              onClick={handleFixAll} 
              disabled={isFixing}
              variant="destructive"
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  修復中...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  批次修復所有問題
                </>
              )}
            </Button>
          )}
        </div>

        {/* 選項格式錯誤列表 */}
        {checkResult?.invalidOptionsQuestions && checkResult.invalidOptionsQuestions.length > 0 && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                選項格式錯誤
              </CardTitle>
              <CardDescription>
                以下題目的選項格式不正確（非陣列格式或包含空選項）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>題目 ID</TableHead>
                    <TableHead>題目內容</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>問題描述</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkResult.invalidOptionsQuestions.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono">{q.id}</TableCell>
                      <TableCell className="max-w-md truncate">{q.question}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {q.type === 'multiple_choice' ? '選擇題' : q.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{q.issue}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 缺少必要欄位列表 */}
        {checkResult?.missingFieldsQuestions && checkResult.missingFieldsQuestions.length > 0 && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                缺少必要欄位
              </CardTitle>
              <CardDescription>
                以下題目缺少必要的欄位資訊
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>題目 ID</TableHead>
                    <TableHead>題目內容</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>缺少欄位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkResult.missingFieldsQuestions.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono">{q.id}</TableCell>
                      <TableCell className="max-w-md truncate">{q.question || '(無題目內容)'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {q.type === 'multiple_choice' ? '選擇題' : 
                           q.type === 'true_false' ? '是非題' : 
                           q.type === 'short_answer' ? '問答題' : q.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {q.missingFields.map((field: string) => (
                            <Badge key={field} variant="secondary">
                              {field === 'question' ? '題目內容' :
                               field === 'correctAnswer' ? '正確答案' :
                               field === 'options' ? '選項' : field}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 無問題提示 */}
        {checkResult && totalIssues === 0 && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">資料品質良好</h3>
                <p className="text-muted-foreground">
                  所有題目的格式都正確，沒有發現任何問題
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

