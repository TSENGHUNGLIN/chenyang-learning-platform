import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, BookOpen, Lightbulb, Target, Home, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function LearningRecommendations() {
  const [, setLocation] = useLocation();
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: recommendations, isLoading, refetch } = trpc.learningRecommendations.getMyRecommendations.useQuery();
  const markAsReadMutation = trpc.learningRecommendations.markAsRead.useMutation({
    onSuccess: () => {
      toast.success("已標記為已讀");
      refetch();
    },
    onError: (error) => {
      toast.error(`標記失敗：${error.message}`);
    },
  });

  const handleViewDetail = (recommendation: any) => {
    setSelectedRecommendation(recommendation);
    setDetailDialogOpen(true);

    // 自動標記為已讀
    if (recommendation.isRead === 0) {
      markAsReadMutation.mutate(recommendation.id);
    }
  };

  const getRecommendationIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      weak_topics: Target,
      practice_questions: BookOpen,
      study_materials: Lightbulb,
      ai_generated: Lightbulb,
    };
    return iconMap[type] || Lightbulb;
  };

  const getRecommendationTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      weak_topics: "需加強知識點",
      practice_questions: "建議練習題目",
      study_materials: "學習資料推薦",
      ai_generated: "AI 學習建議",
    };
    return labelMap[type] || type;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      high: { label: "高", className: "bg-red-100 text-red-800" },
      medium: { label: "中", className: "bg-yellow-100 text-yellow-800" },
      low: { label: "低", className: "bg-green-100 text-green-800" },
    };

    const priorityInfo = priorityMap[priority] || priorityMap.medium;

    return (
      <Badge variant="outline" className={priorityInfo.className}>
        {priorityInfo.label}
      </Badge>
    );
  };

  const renderRecommendationContent = (recommendation: any) => {
    try {
      const content = JSON.parse(recommendation.content);

      if (recommendation.recommendationType === "weak_topics") {
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{content.summary}</p>
            <div className="space-y-2">
              {content.topics?.map((topic: any, index: number) => (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{topic.categoryName}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          答錯 {topic.wrongCount} 題
                        </p>
                      </div>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      }

      if (recommendation.recommendationType === "practice_questions") {
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{content.summary}</p>
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                共 {content.questionIds?.length || 0} 道題目建議練習
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="text-sm text-muted-foreground">
          {content.summary || "暫無詳細內容"}
        </div>
      );
    } catch (error) {
      return (
        <div className="text-sm text-muted-foreground">
          {recommendation.content}
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = recommendations?.filter((r: any) => r.isRead === 0).length || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">學習建議</h1>
          <p className="text-muted-foreground mt-2">
            根據您的答題情況，為您提供個人化學習建議
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <Home className="h-4 w-4 mr-2" />
          返回首頁
        </Button>
      </div>

      {unreadCount > 0 && (
        <Card className="mb-6 border-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">
                  您有 {unreadCount} 條新的學習建議
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  點擊建議卡片查看詳細內容
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!recommendations || recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">目前沒有學習建議</p>
              <p className="text-sm text-muted-foreground mt-2">
                完成考試後，系統會根據您的答題情況生成學習建議
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recommendations.map((recommendation: any) => {
            const Icon = getRecommendationIcon(recommendation.recommendationType);
            return (
              <Card
                key={recommendation.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  recommendation.isRead === 0 ? "border-blue-500" : ""
                }`}
                onClick={() => handleViewDetail(recommendation)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {recommendation.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {getRecommendationTypeLabel(recommendation.recommendationType)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(recommendation.priority)}
                      {recommendation.isRead === 0 && (
                        <Badge className="bg-blue-500">新</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {recommendation.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      {new Date(recommendation.createdAt).toLocaleString("zh-TW")}
                    </span>
                    <Button variant="link" size="sm">
                      查看詳情 →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 詳細內容對話框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecommendation && (
                <>
                  {(() => {
                    const Icon = getRecommendationIcon(
                      selectedRecommendation.recommendationType
                    );
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                  {selectedRecommendation.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRecommendation &&
                getRecommendationTypeLabel(selectedRecommendation.recommendationType)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedRecommendation && renderRecommendationContent(selectedRecommendation)}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-xs text-muted-foreground">
              建立時間：
              {selectedRecommendation &&
                new Date(selectedRecommendation.createdAt).toLocaleString("zh-TW")}
            </span>
            <Button onClick={() => setDetailDialogOpen(false)}>關閉</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

