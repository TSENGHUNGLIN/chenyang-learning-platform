import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Home, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// 註冊 Chart.js 組件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ScoreTrends() {
  const [, setLocation] = useLocation();
  const { data: trends, isLoading } = trpc.scores.myTrends.useQuery({ limit: 10 });
  const { data: accuracy } = trpc.scores.answerAccuracy.useQuery();

  // 成績趨勢圖表資料
  const trendChartData = trends ? {
    labels: trends.map(t => t.examTitle),
    datasets: [
      {
        label: "考試分數 (%)",
        data: trends.map(t => t.percentage),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: trends.map(t => t.passed === 1 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"),
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  } : null;

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const index = context.dataIndex;
            const passed = trends?.[index]?.passed === 1;
            return `分數: ${context.parsed.y}% (${passed ? "及格" : "不及格"})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  // 答題正確率圖表資料
  const accuracyChartData = accuracy && accuracy.length > 0 ? {
    labels: accuracy.map(a => {
      const typeMap: Record<string, string> = {
        "true_false": "是非題",
        "multiple_choice": "單選題",
        "multiple_answer": "複選題",
        "short_answer": "簡答題",
      };
      return typeMap[a.questionType] || a.questionType;
    }),
    datasets: [
      {
        label: "正確率 (%)",
        data: accuracy.map(a => a.accuracy),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 146, 60, 0.8)",
          "rgba(168, 85, 247, 0.8)",
        ],
        borderColor: [
          "rgb(59, 130, 246)",
          "rgb(34, 197, 94)",
          "rgb(251, 146, 60)",
          "rgb(168, 85, 247)",
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  const accuracyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const index = context.dataIndex;
            const stat = accuracy?.[index];
            if (!stat) return "";
            return [
              `正確率: ${stat.accuracy}%`,
              `答對: ${stat.correctCount} 題`,
              `答錯: ${stat.incorrectCount} 題`,
              `總計: ${stat.totalQuestions} 題`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">成績趨勢分析</h1>
            <p className="text-muted-foreground">查看您的成績變化趨勢與答題正確率分析</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <Home className="mr-2 h-4 w-4" />
            返回首頁
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 成績趨勢圖 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  成績趨勢圖
                </CardTitle>
                <CardDescription>最近 10 次考試的分數變化（綠點=及格，紅點=不及格）</CardDescription>
              </CardHeader>
              <CardContent>
                {!trends || trends.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>尚無考試記錄</p>
                  </div>
                ) : (
                  <div style={{ height: "400px" }}>
                    {trendChartData && (
                      <Line data={trendChartData} options={trendChartOptions} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 答題正確率分析 */}
            <Card>
              <CardHeader>
                <CardTitle>答題正確率分析</CardTitle>
                <CardDescription>依題型統計的答題正確率</CardDescription>
              </CardHeader>
              <CardContent>
                {!accuracy || accuracy.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>尚無答題記錄</p>
                  </div>
                ) : (
                  <>
                    <div style={{ height: "400px" }}>
                      {accuracyChartData && (
                        <Line data={accuracyChartData} options={accuracyChartOptions} />
                      )}
                    </div>
                    
                    {/* 統計表格 */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {accuracy.map((stat, index) => {
                        const typeMap: Record<string, string> = {
                          "true_false": "是非題",
                          "multiple_choice": "單選題",
                          "multiple_answer": "複選題",
                          "short_answer": "簡答題",
                        };
                        const colors = [
                          "border-blue-500",
                          "border-green-500",
                          "border-orange-500",
                          "border-purple-500",
                        ];
                        return (
                          <Card key={stat.questionType} className={`border-l-4 ${colors[index % colors.length]}`}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">
                                {typeMap[stat.questionType] || stat.questionType}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">正確率</span>
                                  <span className="font-semibold">{stat.accuracy}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">答對</span>
                                  <span className="text-green-600">{stat.correctCount} 題</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">答錯</span>
                                  <span className="text-red-600">{stat.incorrectCount} 題</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">總計</span>
                                  <span>{stat.totalQuestions} 題</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

