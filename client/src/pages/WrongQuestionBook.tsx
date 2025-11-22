import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookX, CheckCircle2, AlertCircle, Trash2, RefreshCw, TrendingUp, Home } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function WrongQuestionBook() {
  const [activeTab, setActiveTab] = useState("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string | undefined>(undefined);

  // 查詢錯題列表
  const { data: wrongQuestions, isLoading, refetch } = trpc.wrongQuestionBook.list.useQuery({
    questionType: questionTypeFilter,
    isReviewed: activeTab === "reviewed" ? true : activeTab === "unreviewed" ? false : undefined,
  });

  // 查詢錯題統計
  const { data: stats } = trpc.wrongQuestionBook.stats.useQuery();

  // API mutations
  const markAsReviewedMutation = trpc.wrongQuestionBook.markAsReviewed.useMutation({
    onSuccess: () => {
      toast.success("已標記為已複習");
      refetch();
    },
    onError: (error) => {
      toast.error("標記失敗：" + error.message);
    },
  });

  const batchMarkAsReviewedMutation = trpc.wrongQuestionBook.batchMarkAsReviewed.useMutation({
    onSuccess: () => {
      toast.success("批次標記成功");
      refetch();
    },
    onError: (error) => {
      toast.error("批次標記失敗：" + error.message);
    },
  });

  const removeMutation = trpc.wrongQuestionBook.remove.useMutation({
    onSuccess: () => {
      toast.success("已移除錯題記錄");
      refetch();
    },
    onError: (error) => {
      toast.error("移除失敗：" + error.message);
    },
  });

  // 處理標記為已複習
  const handleMarkAsReviewed = (wrongQuestionId: number) => {
    markAsReviewedMutation.mutate(wrongQuestionId);
  };

  // 處理批次標記為已複習
  const handleBatchMarkAsReviewed = () => {
    if (!wrongQuestions || wrongQuestions.length === 0) return;

    const unreviewedIds = wrongQuestions
      .filter((item: any) => !item.isReviewed)
      .map((item: any) => item.id);

    if (unreviewedIds.length === 0) {
      toast.info("沒有未複習的錯題");
      return;
    }

    batchMarkAsReviewedMutation.mutate(unreviewedIds);
  };

  // 處理移除錯題
  const handleRemove = (questionId: number) => {
    if (confirm("確定要移除此錯題記錄嗎？")) {
      removeMutation.mutate(questionId);
    }
  };

  // 取得題型標籤
  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case "true_false":
        return <Badge variant="secondary">是非題</Badge>;
      case "single_choice":
        return <Badge variant="default">單選題</Badge>;
      case "multiple_choice":
        return <Badge variant="default" className="bg-purple-500">多選題</Badge>;
      case "short_answer":
        return <Badge variant="outline">簡答題</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // 取得難度標籤
  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge variant="outline" className="border-green-500 text-green-700">簡單</Badge>;
      case "medium":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">中等</Badge>;
      case "hard":
        return <Badge variant="outline" className="border-red-500 text-red-700">困難</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  // 渲染錯題卡片
  const renderWrongQuestionCard = (item: any) => {
    return (
      <Card key={item.id} className={item.isReviewed ? "bg-gray-50" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getQuestionTypeBadge(item.questionType)}
                {getDifficultyBadge(item.difficulty)}
                {item.category && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {item.category}
                  </Badge>
                )}
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  答錯 {item.wrongCount} 次
                </Badge>
                {item.isReviewed === 1 && (
                  <Badge variant="default" className="bg-green-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    已複習
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{item.questionContent}</CardTitle>
              <CardDescription className="mt-2">
                最後答錯時間：{new Date(item.lastWrongAt).toLocaleString("zh-TW")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {item.isReviewed === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAsReviewed(item.id)}
                  disabled={markAsReviewedMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  標記已複習
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(item.questionId)}
                disabled={removeMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 選項（如果有） */}
            {item.questionOptions && (
              <div>
                <p className="font-semibold mb-2">選項：</p>
                <div className="space-y-1">
                  {JSON.parse(item.questionOptions).map((option: any, index: number) => (
                    <div key={index} className="pl-4">
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 正確答案 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-800 mb-2">正確答案：</p>
              <p className="text-green-700">{item.correctAnswer}</p>
            </div>

            {/* 解析（如果有） */}
            {item.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-800 mb-2">解析：</p>
                <p className="text-blue-700">{item.explanation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookX className="h-8 w-8" />
              錯題本
            </h1>
            <p className="text-muted-foreground mt-2">
              自動收集答錯的題目，幫助您針對性複習
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
          >
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>總錯題數</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>未複習</CardDescription>
                <CardTitle className="text-3xl text-orange-500">{stats.unreviewed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>已複習</CardDescription>
                <CardTitle className="text-3xl text-green-500">{stats.reviewed}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* 篩選和操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={questionTypeFilter || "all"} onValueChange={(value) => setQuestionTypeFilter(value === "all" ? undefined : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="選擇題型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部題型</SelectItem>
                <SelectItem value="true_false">是非題</SelectItem>
                <SelectItem value="single_choice">單選題</SelectItem>
                <SelectItem value="multiple_choice">多選題</SelectItem>
                <SelectItem value="short_answer">簡答題</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重新整理
            </Button>
            <Button
              onClick={handleBatchMarkAsReviewed}
              disabled={batchMarkAsReviewedMutation.isPending || !wrongQuestions || wrongQuestions.length === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              全部標記為已複習
            </Button>
          </div>
        </div>

        {/* 錯題列表 */}
        {(!wrongQuestions || wrongQuestions.length === 0) ? (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              {activeTab === "all" 
                ? "目前沒有錯題記錄，繼續保持！" 
                : activeTab === "unreviewed"
                ? "沒有未複習的錯題。"
                : "沒有已複習的錯題。"}
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">
                全部 ({stats?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="unreviewed">
                未複習 ({stats?.unreviewed || 0})
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                已複習 ({stats?.reviewed || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {wrongQuestions.map((item: any) => renderWrongQuestionCard(item))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

